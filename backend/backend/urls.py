"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from transactions.views import ExpenseViewSet, PurchaseViewSet, SaleViewSet
from users.views import auth_status, login_user, logout_user, password_reset_confirm, password_reset_request
from vehicles.views import VehicleViewSet, activity_logs, public_rto_links, search_vehicle


def health_check(_request):
    return JsonResponse({"status": "ok"})

router = DefaultRouter()
router.register('vehicles', VehicleViewSet)
router.register('purchase', PurchaseViewSet)
router.register('expense', ExpenseViewSet)
router.register('sale', SaleViewSet)

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/health/', health_check),
    path('api/', include(router.urls)),
    path('api/search/', search_vehicle),
    path('api/rto-links/', public_rto_links),
    path('api/activity/', activity_logs),
    path('api/auth/status/', auth_status),
    path('api/auth/login/', login_user),
    path('api/auth/logout/', logout_user),
    path('api/auth/password-reset/', password_reset_request),
    path('api/auth/password-reset/confirm/', password_reset_confirm),
]
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
