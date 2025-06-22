# tickets/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, TicketViewSet

router = DefaultRouter()
router.register(r'orders', OrderViewSet)
router.register(r'', TicketViewSet, basename='ticket') # basename נחוץ עבור ReadOnlyModelViewSet

urlpatterns = [
    path('', include(router.urls)),
    # נקודת קצה לרכישת כרטיסים: /api/orders/purchase_tickets/
    # היא כבר כלולה בתוך router.urls כי היא @action של OrderViewSet
]
