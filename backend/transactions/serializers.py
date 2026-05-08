from rest_framework import serializers
from .models import Purchase, Expense, Sale

class PurchaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Purchase
        fields = '__all__'

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Purchase amount cannot be negative.")
        return value

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Expense amount cannot be negative.")
        return value

class SaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sale
        fields = '__all__'

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Sale amount cannot be negative.")
        return value

    def validate(self, attrs):
        vehicle = attrs.get("vehicle") or getattr(self.instance, "vehicle", None)
        sale_date = attrs.get("date") or getattr(self.instance, "date", None)
        if vehicle and sale_date:
            purchase = vehicle.purchase_set.order_by("date", "id").first()
            if purchase and sale_date < purchase.date:
                raise serializers.ValidationError({"date": "Sale date cannot be before purchase date."})
        return attrs
