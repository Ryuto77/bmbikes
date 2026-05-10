from django.db import models
from vehicles.models import Vehicle
# Create your models here.
class Purchase(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    amount = models.FloatField()
    date = models.DateField()
    seller_name = models.CharField(max_length=120, blank=True)
    seller_phone = models.CharField(max_length=20, blank=True)
    seller_aadhaar = models.CharField(max_length=20, blank=True)

class Expense(models.Model):
    vehicle = models.ForeignKey('vehicles.Vehicle', on_delete=models.CASCADE)
    type = models.CharField(max_length=50)
    amount = models.FloatField()
    date = models.DateField()

    def __str__(self):
        return f"{self.type} - {self.amount}"

class Sale(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    amount = models.FloatField()
    date = models.DateField()
    buyer_name = models.CharField(max_length=120, blank=True)
    buyer_phone = models.CharField(max_length=20, blank=True)
    buyer_aadhaar = models.CharField(max_length=20, blank=True)
