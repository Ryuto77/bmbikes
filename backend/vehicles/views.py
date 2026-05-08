from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action, api_view
from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.response import Response
from django.db.models import Exists, Max, OuterRef, Prefetch, Q, Subquery, Sum
from django.db.models.functions import Coalesce
from django.utils.dateparse import parse_date
from django.utils import timezone

from .activity import log_activity
from .models import ActivityLog, Vehicle, VehicleDocument, VehicleImage
from .serializers import ActivityLogSerializer, VehicleSerializer, media_type_for_name, validate_document_file, validate_gallery_media
from transactions.models import Purchase, Expense, Sale


class VehiclePermission(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated


# ✅ THIS WAS MISSING OR DELETED
class VehicleViewSet(ModelViewSet):
    queryset = Vehicle.objects.all().prefetch_related("images", "documents")
    serializer_class = VehicleSerializer
    permission_classes = [VehiclePermission]

    def get_queryset(self):
        purchase_query = Purchase.objects.filter(vehicle=OuterRef("pk")).order_by("date", "id")
        sale_query = Sale.objects.filter(vehicle=OuterRef("pk")).order_by("-date", "-id")
        expense_query = Expense.objects.filter(vehicle=OuterRef("pk")).order_by("-date", "-id")
        queryset = Vehicle.objects.filter(is_archived=False).annotate(
            has_sale=Exists(Sale.objects.filter(vehicle=OuterRef("pk"))),
            latest_sale_amount=Subquery(sale_query.values("amount")[:1]),
            latest_sale_date=Subquery(sale_query.values("date")[:1]),
            first_purchase_amount=Subquery(purchase_query.values("amount")[:1]),
            first_purchase_date=Subquery(purchase_query.values("date")[:1]),
            expense_total=Coalesce(Sum("expense__amount"), 0.0),
            latest_expense=Subquery(expense_query.values("date")[:1]),
        )

        prefetches = ["images"]
        if self.request.user and self.request.user.is_authenticated:
            prefetches.append("documents")

        queryset = queryset.prefetch_related(*prefetches)
        search = (self.request.query_params.get("search") or "").strip()
        status = (self.request.query_params.get("status") or "").strip().lower()
        brand = (self.request.query_params.get("brand") or "").strip()

        if search:
            queryset = queryset.filter(
                Q(vehicle_number__icontains=search) |
                Q(brand__icontains=search) |
                Q(model__icontains=search) |
                Q(name__icontains=search)
            )
        if brand:
            queryset = queryset.filter(brand__iexact=brand)
        if status == "sold":
            queryset = queryset.filter(sale__isnull=False).distinct()
        elif status in {"in_stock", "unsold"}:
            queryset = queryset.filter(sale__isnull=True)

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page_number = request.query_params.get("page")
        page_size = request.query_params.get("page_size")

        if page_number and page_size:
            try:
                page_number = max(1, int(page_number))
                page_size = min(100, max(1, int(page_size)))
            except ValueError:
                return Response({"error": "page and page_size must be numbers."}, status=400)

            total = queryset.count()
            start = (page_number - 1) * page_size
            serializer = self.get_serializer(queryset[start:start + page_size], many=True)
            return Response({
                "count": total,
                "page": page_number,
                "page_size": page_size,
                "results": serializer.data,
            })

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def next_image_order(self, vehicle):
        return (vehicle.images.aggregate(max_order=Max("order"))["max_order"] or 0) + 1

    def preserve_previous_cover(self, vehicle, previous_cover_name):
        if not previous_cover_name or previous_cover_name == vehicle.cover_image.name:
            return
        if vehicle.images.filter(image=previous_cover_name).exists():
            return
        VehicleImage.objects.create(
            vehicle=vehicle,
            image=previous_cover_name,
            order=self.next_image_order(vehicle),
        )

    def save_extra_images(self, vehicle):
        next_order = self.next_image_order(vehicle)
        cover_upload = self.request.FILES.get("cover_image")
        seen_uploads = set()

        def should_skip(file):
            signature = (getattr(file, "name", ""), getattr(file, "size", None))
            if cover_upload and signature == (getattr(cover_upload, "name", ""), getattr(cover_upload, "size", None)):
                return True
            if signature in seen_uploads:
                return True
            seen_uploads.add(signature)
            return False

        for image in self.request.FILES.getlist("images"):
            if should_skip(image):
                continue
            validate_gallery_media(image)
            VehicleImage.objects.create(vehicle=vehicle, image=image, order=next_order)
            next_order += 1
        for image in self.request.FILES.getlist("extra_images"):
            if should_skip(image):
                continue
            validate_gallery_media(image)
            VehicleImage.objects.create(vehicle=vehicle, image=image, order=next_order)
            next_order += 1

    def perform_create(self, serializer):
        vehicle = serializer.save()
        self.save_extra_images(vehicle)
        log_activity(self.request, "Vehicle added", vehicle, f"{vehicle.vehicle_number} was added to stock.")

    def perform_update(self, serializer):
        previous_cover_name = serializer.instance.cover_image.name if serializer.instance.cover_image else ""
        vehicle = serializer.save()
        if "cover_image" in self.request.FILES:
            self.preserve_previous_cover(vehicle, previous_cover_name)
        self.save_extra_images(vehicle)
        log_activity(self.request, "Vehicle updated", vehicle, f"{vehicle.vehicle_number} details were updated.")

    def perform_destroy(self, instance):
        details = f"{instance.vehicle_number} was removed from stock."
        log_activity(self.request, "Vehicle deleted", instance, details)
        instance.is_archived = True
        instance.archived_at = timezone.now()
        instance.save(update_fields=["is_archived", "archived_at"])

    @action(detail=True, methods=["post"])
    def status(self, request, pk=None):
        vehicle = self.get_object()
        next_status = request.data.get("status")

        if next_status == "sold":
            try:
                amount = float(request.data.get("amount", 0) or 0)
            except (TypeError, ValueError):
                return Response({"error": "Sale amount must be a number."}, status=400)
            if amount < 0:
                return Response({"error": "Sale amount cannot be negative."}, status=400)

            sale_date_value = request.data.get("date")
            sale_date = parse_date(sale_date_value) if sale_date_value else timezone.localdate()
            if sale_date is None:
                return Response({"error": "Sale date is invalid."}, status=400)

            purchase = Purchase.objects.filter(vehicle=vehicle).order_by("date", "id").first()
            if purchase and sale_date < purchase.date:
                return Response({"error": "Sale date cannot be before purchase date."}, status=400)

            Sale.objects.update_or_create(
                vehicle=vehicle,
                defaults={"amount": amount, "date": sale_date},
            )
            log_activity(request, "Vehicle marked sold", vehicle, f"{vehicle.vehicle_number} was marked sold.")
        elif next_status in ["unsold", "in_stock"]:
            Sale.objects.filter(vehicle=vehicle).delete()
            log_activity(request, "Vehicle marked in stock", vehicle, f"{vehicle.vehicle_number} was returned to stock.")
        else:
            return Response({"error": "Status must be sold or unsold."}, status=400)

        serializer = self.get_serializer(vehicle)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="set-cover-image")
    def set_cover_image(self, request, pk=None):
        vehicle = self.get_object()
        image_id = request.data.get("image_id")
        try:
            image = vehicle.images.get(id=image_id)
        except VehicleImage.DoesNotExist:
            return Response({"error": "Image not found for this vehicle."}, status=404)

        if media_type_for_name(image.image.name) != "image":
            return Response({"error": "Only images can be used as cover."}, status=400)
        vehicle.cover_image.name = image.image.name
        vehicle.save(update_fields=["cover_image"])
        log_activity(request, "Cover image changed", vehicle, f"{vehicle.vehicle_number} cover image was changed.")
        return Response(self.get_serializer(vehicle).data)

    @action(detail=True, methods=["post"], url_path="delete-image")
    def delete_image(self, request, pk=None):
        vehicle = self.get_object()
        image_id = request.data.get("image_id")
        deleted, _ = vehicle.images.filter(id=image_id).delete()
        if not deleted:
            return Response({"error": "Image not found for this vehicle."}, status=404)
        log_activity(request, "Gallery image deleted", vehicle, f"An image was removed from {vehicle.vehicle_number}.")
        return Response(self.get_serializer(vehicle).data)

    @action(detail=True, methods=["post"], url_path="reorder-images")
    def reorder_images(self, request, pk=None):
        vehicle = self.get_object()
        image_ids = request.data.get("image_ids", [])
        if not isinstance(image_ids, list):
            return Response({"error": "image_ids must be a list."}, status=400)

        images = {image.id: image for image in vehicle.images.filter(id__in=image_ids)}
        for index, image_id in enumerate(image_ids):
            image = images.get(int(image_id)) if str(image_id).isdigit() else None
            if image:
                image.order = index
                image.save(update_fields=["order"])
        log_activity(request, "Gallery reordered", vehicle, f"{vehicle.vehicle_number} gallery order was updated.")
        return Response(self.get_serializer(vehicle).data)

    @action(detail=True, methods=["post"], url_path="upload-document")
    def upload_document(self, request, pk=None):
        vehicle = self.get_object()
        title = (request.data.get("title") or "").strip()
        file = request.FILES.get("file")
        if not title or not file:
            return Response({"error": "Document title and file are required."}, status=400)
        try:
            validate_document_file(file)
        except Exception as exc:
            detail = exc.detail[0] if hasattr(exc, "detail") and exc.detail else str(exc)
            return Response({"error": detail}, status=400)

        VehicleDocument.objects.create(vehicle=vehicle, title=title, file=file)
        log_activity(request, "Document uploaded", vehicle, f"{title} was uploaded for {vehicle.vehicle_number}.")
        return Response(self.get_serializer(vehicle).data)

    @action(detail=True, methods=["post"], url_path="delete-document")
    def delete_document(self, request, pk=None):
        vehicle = self.get_object()
        document_id = request.data.get("document_id")
        deleted, _ = vehicle.documents.filter(id=document_id).delete()
        if not deleted:
            return Response({"error": "Document not found for this vehicle."}, status=404)
        log_activity(request, "Document deleted", vehicle, f"A document was removed from {vehicle.vehicle_number}.")
        return Response(self.get_serializer(vehicle).data)


# ✅ Your search API
@api_view(['GET'])
def search_vehicle(request):
    number = (request.GET.get('number') or "").strip().upper()

    try:
        vehicle = Vehicle.objects.get(vehicle_number=number, is_archived=False)

        purchase = Purchase.objects.filter(vehicle=vehicle).first()
        sale = Sale.objects.filter(vehicle=vehicle).first()
        expenses = Expense.objects.filter(vehicle=vehicle)

        # Purchase
        purchase_data = {
            "id": purchase.id if purchase else None,
            "amount": purchase.amount if purchase else 0,
            "date": purchase.date if purchase else None
        }

        # Sale
        sale_data = {
            "id": sale.id if sale else None,
            "amount": sale.amount if sale else 0,
            "date": sale.date if sale else None
        }

        # Expenses
        expense_list = []
        total_expense = 0

        for e in expenses:
            expense_list.append({
                "id": e.id,
                "type": e.type,
                "amount": e.amount,
                "date": e.date
            })
            total_expense += e.amount

        # Calculations
        profit = sale_data["amount"] - (purchase_data["amount"] + total_expense)
        total_investment = purchase_data["amount"] + total_expense
        status = "sold" if sale else "unsold"

        # Final response
        return Response({
            "vehicle": {
                "id": vehicle.id,
                "name": vehicle.name,
                "vehicle_number": vehicle.vehicle_number,
                "brand": vehicle.brand,
                "model": vehicle.model,
                "year": vehicle.year,
                "km_driven": vehicle.km_driven,
                "cover_image": request.build_absolute_uri(vehicle.cover_image.url) if vehicle.cover_image else None,
                "images": [
                    {
                        "id": img.id,
                        "url": request.build_absolute_uri(img.image.url),
                        "image": request.build_absolute_uri(img.image.url),
                        "media_type": media_type_for_name(img.image.name),
                    }
                    for img in vehicle.images.all()
                ],
                "documents": [
                    {
                        "id": doc.id,
                        "title": doc.title,
                        "file": request.build_absolute_uri(doc.file.url),
                        "created_at": doc.created_at,
                    }
                    for doc in vehicle.documents.all()
                ],
            },
            "purchase": purchase_data,
            "expenses": expense_list,
            "total_expense": total_expense,
            "total_investment": total_investment,
            "sale": sale_data,
            "status": status,
            "profit": profit
        })

    except Vehicle.DoesNotExist:
        return Response({"error": "Vehicle not found"})


@api_view(['GET'])
def activity_logs(request):
    if not request.user or not request.user.is_authenticated:
        return Response({"detail": "Authentication credentials were not provided."}, status=403)

    vehicle_number = request.GET.get("vehicle")
    logs = ActivityLog.objects.select_related("vehicle").all()
    if vehicle_number:
        logs = logs.filter(vehicle__vehicle_number=vehicle_number)
    serializer = ActivityLogSerializer(logs[:100], many=True)
    return Response(serializer.data)
