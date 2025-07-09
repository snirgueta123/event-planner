# seats/urls.py
from rest_framework.routers import DefaultRouter
from .views import SeatViewSet, SeatingMapRetrieveViewSet

router = DefaultRouter()
router.register(r'seats', SeatViewSet, basename='seat') # /api/seats/
router.register(r'seating-maps', SeatingMapRetrieveViewSet, basename='seating-map') # /api/seating-maps/

urlpatterns = router.urls
