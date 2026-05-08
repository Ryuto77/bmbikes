from django.db import models

# Create your models here.
class Vehicle(models.Model):
    name = models.CharField(max_length=100)
    vehicle_number = models.CharField(max_length=20, unique=True)
    brand = models.CharField(max_length=50)
    model = models.CharField(max_length=50)
    year = models.IntegerField()
    km_driven = models.IntegerField(null=True, blank=True)
    cover_image = models.ImageField(upload_to='vehicles/', null=True, blank=True)
    is_archived = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return self.vehicle_number
    
class VehicleImage(models.Model):
    vehicle = models.ForeignKey('vehicles.Vehicle', on_delete=models.CASCADE, related_name='images')
    image = models.FileField(upload_to='vehicles/')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"Image for {self.vehicle.vehicle_number}"


class VehicleDocument(models.Model):
    vehicle = models.ForeignKey('vehicles.Vehicle', on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=100)
    file = models.FileField(upload_to='vehicle_documents/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.vehicle.vehicle_number}"


class ActivityLog(models.Model):
    vehicle = models.ForeignKey('vehicles.Vehicle', on_delete=models.SET_NULL, null=True, blank=True, related_name='activity_logs')
    actor = models.CharField(max_length=150, blank=True)
    action = models.CharField(max_length=80)
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        target = self.vehicle.vehicle_number if self.vehicle else "General"
        return f"{self.action} - {target}"
