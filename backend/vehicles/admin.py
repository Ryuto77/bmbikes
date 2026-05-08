from django.contrib import admin
from transactions.models import Expense, Purchase, Sale
from .models import ActivityLog, Vehicle, VehicleDocument, VehicleImage


class VehicleImageInline(admin.TabularInline):
    model = VehicleImage
    extra = 1


class VehicleDocumentInline(admin.TabularInline):
    model = VehicleDocument
    extra = 1


class PurchaseInline(admin.TabularInline):
    model = Purchase
    extra = 0


class ExpenseInline(admin.TabularInline):
    model = Expense
    extra = 1


class SaleInline(admin.TabularInline):
    model = Sale
    extra = 0


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ("vehicle_number", "brand", "model", "year", "km_driven", "is_archived", "archived_at")
    list_filter = ("brand", "year", "is_archived")
    search_fields = ("vehicle_number", "brand", "model", "name")
    ordering = ("vehicle_number",)
    inlines = [PurchaseInline, ExpenseInline, SaleInline, VehicleImageInline, VehicleDocumentInline]
    actions = ["restore_archived"]

    @admin.action(description="Restore archived vehicles")
    def restore_archived(self, request, queryset):
        queryset.update(is_archived=False, archived_at=None)


@admin.register(VehicleImage)
class VehicleImageAdmin(admin.ModelAdmin):
    list_display = ("vehicle", "image", "order")
    search_fields = ("vehicle__vehicle_number", "vehicle__brand", "vehicle__model")


@admin.register(VehicleDocument)
class VehicleDocumentAdmin(admin.ModelAdmin):
    list_display = ("vehicle", "title", "created_at")
    search_fields = ("vehicle__vehicle_number", "title")


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("action", "vehicle", "actor", "created_at")
    list_filter = ("action", "created_at")
    search_fields = ("vehicle__vehicle_number", "actor", "action", "details")
    readonly_fields = ("vehicle", "actor", "action", "details", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
