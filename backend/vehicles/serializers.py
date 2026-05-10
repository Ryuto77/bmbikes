import re
from pathlib import Path
from urllib.parse import urlparse

from django.utils import timezone
from rest_framework import serializers
from .models import ActivityLog, Vehicle, VehicleDocument, VehicleImage

VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".m4v", ".avi"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
DOCUMENT_EXTENSIONS = {".pdf", ".jpg", ".jpeg"}

def media_type_for_name(name):
    suffix = Path(str(name)).suffix.lower()
    if suffix in VIDEO_EXTENSIONS:
        return "video"
    return "image"


def validate_gallery_media(file):
    suffix = Path(file.name).suffix.lower()
    if suffix not in IMAGE_EXTENSIONS and suffix not in VIDEO_EXTENSIONS:
        raise serializers.ValidationError("Upload an image or video file.")
    return file


def validate_document_file(file):
    suffix = Path(file.name).suffix.lower()
    if suffix not in DOCUMENT_EXTENSIONS:
        raise serializers.ValidationError("Upload a PDF or JPEG document.")
    return file


def safe_file_url(file_field, request=None):
    if not file_field or not getattr(file_field, "name", ""):
        return None
    try:
        url = file_field.url
    except Exception:
        return None

    parsed = urlparse(url)
    if parsed.scheme and parsed.netloc:
        return url
    return request.build_absolute_uri(url) if request else url


class SafeFileUrlField(serializers.FileField):
    def to_representation(self, value):
        request = self.context.get("request")
        return safe_file_url(value, request)


class SafeImageUrlField(serializers.ImageField):
    def to_representation(self, value):
        request = self.context.get("request")
        return safe_file_url(value, request)


class VehicleImageSerializer(serializers.ModelSerializer):
    image = SafeFileUrlField(required=False, allow_null=True)
    media_type = serializers.SerializerMethodField()

    class Meta:
        model = VehicleImage
        fields = ['id', 'image', 'order', 'media_type']

    def validate_image(self, value):
        return validate_gallery_media(value)

    def get_media_type(self, obj):
        return media_type_for_name(obj.image.name)


class VehicleDocumentSerializer(serializers.ModelSerializer):
    file = SafeFileUrlField(required=True)

    class Meta:
        model = VehicleDocument
        fields = ['id', 'title', 'document_stage', 'file', 'created_at']


class ActivityLogSerializer(serializers.ModelSerializer):
    vehicle_number = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = ['id', 'vehicle', 'vehicle_number', 'actor', 'action', 'details', 'created_at']

    def get_vehicle_number(self, obj):
        return obj.vehicle.vehicle_number if obj.vehicle else ""

class VehicleSerializer(serializers.ModelSerializer):
    cover_image = SafeImageUrlField(required=False, allow_null=True)
    status = serializers.SerializerMethodField()
    images = VehicleImageSerializer(many=True, read_only=True)
    documents = serializers.SerializerMethodField()
    purchase_amount = serializers.SerializerMethodField()
    purchase_date = serializers.SerializerMethodField()
    sale_amount = serializers.SerializerMethodField()
    sale_date = serializers.SerializerMethodField()
    total_expense = serializers.SerializerMethodField()
    latest_expense_date = serializers.SerializerMethodField()
    profit = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = '__all__'

    def can_view_finance(self):
        request = self.context.get("request")
        return bool(request and request.user and request.user.is_authenticated and request.user.is_staff)

    def get_status(self, obj):
        from transactions.models import Sale
        if hasattr(obj, "has_sale"):
            return "sold" if obj.has_sale else "unsold"
        if hasattr(obj, "prefetched_sales"):
            return "sold" if obj.prefetched_sales else "unsold"
        return "sold" if Sale.objects.filter(vehicle=obj).exists() else "unsold"

    def get_documents(self, obj):
        if not self.can_view_finance():
            return []
        return VehicleDocumentSerializer(obj.documents.all(), many=True, context=self.context).data

    def get_purchase(self, obj):
        from transactions.models import Purchase
        if not hasattr(obj, "_cached_purchase"):
            if hasattr(obj, "prefetched_purchases"):
                obj._cached_purchase = obj.prefetched_purchases[0] if obj.prefetched_purchases else None
            else:
                obj._cached_purchase = Purchase.objects.filter(vehicle=obj).order_by("date", "id").first()
        return obj._cached_purchase

    def get_sale(self, obj):
        from transactions.models import Sale
        if not hasattr(obj, "_cached_sale"):
            if hasattr(obj, "prefetched_sales"):
                obj._cached_sale = obj.prefetched_sales[0] if obj.prefetched_sales else None
            else:
                obj._cached_sale = Sale.objects.filter(vehicle=obj).order_by("-date", "-id").first()
        return obj._cached_sale

    def get_expenses(self, obj):
        from transactions.models import Expense
        if hasattr(obj, "prefetched_expenses"):
            return obj.prefetched_expenses
        if not hasattr(obj, "_cached_expenses"):
            obj._cached_expenses = list(Expense.objects.filter(vehicle=obj).order_by("-date", "-id"))
        return obj._cached_expenses

    def get_purchase_amount(self, obj):
        if not self.can_view_finance():
            return 0
        if hasattr(obj, "first_purchase_amount"):
            return obj.first_purchase_amount or 0
        purchase = self.get_purchase(obj)
        return purchase.amount if purchase else 0

    def get_purchase_date(self, obj):
        if not self.can_view_finance():
            return None
        if hasattr(obj, "first_purchase_date"):
            return obj.first_purchase_date
        purchase = self.get_purchase(obj)
        return purchase.date if purchase else None

    def get_sale_amount(self, obj):
        if not self.can_view_finance():
            return 0
        if hasattr(obj, "latest_sale_amount"):
            return obj.latest_sale_amount or 0
        sale = self.get_sale(obj)
        return sale.amount if sale else 0

    def get_sale_date(self, obj):
        if not self.can_view_finance():
            return None
        if hasattr(obj, "latest_sale_date"):
            return obj.latest_sale_date
        sale = self.get_sale(obj)
        return sale.date if sale else None

    def get_total_expense(self, obj):
        if not self.can_view_finance():
            return 0
        if hasattr(obj, "expense_total"):
            return obj.expense_total or 0
        return sum(expense.amount for expense in self.get_expenses(obj))

    def get_latest_expense_date(self, obj):
        if not self.can_view_finance():
            return None
        if hasattr(obj, "latest_expense"):
            return obj.latest_expense
        expenses = self.get_expenses(obj)
        expense = expenses[0] if expenses else None
        return expense.date if expense else None

    def get_profit(self, obj):
        if not self.can_view_finance():
            return 0
        return self.get_sale_amount(obj) - (self.get_purchase_amount(obj) + self.get_total_expense(obj))

    def validate_vehicle_number(self, value):
        normalized = " ".join(value.strip().upper().split())
        if not re.fullmatch(r"[A-Z0-9 -]{4,20}", normalized):
            raise serializers.ValidationError("Use 4-20 letters, numbers, spaces, or hyphens.")
        return normalized

    def validate_year(self, value):
        current_year = timezone.localdate().year
        if value < 1980 or value > current_year + 1:
            raise serializers.ValidationError(f"Year must be between 1980 and {current_year + 1}.")
        return value

    def validate_km_driven(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("KM driven cannot be negative.")
        return value
