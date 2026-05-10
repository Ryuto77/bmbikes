from django.shortcuts import render

# Create your views here.
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import BasePermission
from .models import Purchase, Expense, Sale
from .serializers import PurchaseSerializer, ExpenseSerializer, SaleSerializer
from vehicles.activity import log_activity


class TransactionPermission(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff


class PurchaseViewSet(ModelViewSet):
    queryset = Purchase.objects.all()
    serializer_class = PurchaseSerializer
    permission_classes = [TransactionPermission]

    def perform_create(self, serializer):
        purchase = serializer.save()
        log_activity(self.request, "Purchase added", purchase.vehicle, f"Purchase amount updated to {purchase.amount}.")

    def perform_update(self, serializer):
        purchase = serializer.save()
        log_activity(self.request, "Purchase updated", purchase.vehicle, f"Purchase amount updated to {purchase.amount}.")

class ExpenseViewSet(ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [TransactionPermission]

    def perform_create(self, serializer):
        expense = serializer.save()
        log_activity(self.request, "Expense added", expense.vehicle, f"{expense.type} expense added for {expense.amount}.")

    def perform_update(self, serializer):
        expense = serializer.save()
        log_activity(self.request, "Expense updated", expense.vehicle, f"{expense.type} expense updated to {expense.amount}.")

    def perform_destroy(self, instance):
        log_activity(self.request, "Expense deleted", instance.vehicle, f"{instance.type} expense was deleted.")
        instance.delete()

class SaleViewSet(ModelViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer
    permission_classes = [TransactionPermission]

    def perform_create(self, serializer):
        sale = serializer.save()
        log_activity(self.request, "Sale added", sale.vehicle, f"Sale amount updated to {sale.amount}.")

    def perform_update(self, serializer):
        sale = serializer.save()
        log_activity(self.request, "Sale updated", sale.vehicle, f"Sale amount updated to {sale.amount}.")

    def perform_destroy(self, instance):
        log_activity(self.request, "Sale deleted", instance.vehicle, "Sale record was deleted.")
        instance.delete()
