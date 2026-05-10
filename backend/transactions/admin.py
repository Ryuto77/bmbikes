from django.contrib import admin
from .models import Purchase, Expense, Sale


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ("vehicle", "amount", "date", "seller_name", "seller_phone")
    list_filter = ("date",)
    search_fields = ("vehicle__vehicle_number", "vehicle__brand", "vehicle__model", "seller_name", "seller_phone")


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("vehicle", "type", "amount", "date")
    list_filter = ("type", "date")
    search_fields = ("vehicle__vehicle_number", "vehicle__brand", "vehicle__model", "type")


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ("vehicle", "amount", "date", "buyer_name", "buyer_phone")
    list_filter = ("date",)
    search_fields = ("vehicle__vehicle_number", "vehicle__brand", "vehicle__model", "buyer_name", "buyer_phone")
