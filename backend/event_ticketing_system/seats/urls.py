# seats/urls.py
from rest_framework.routers import DefaultRouter
from .views import SeatViewSet, SeatingMapRetrieveViewSet

# יצירת ראוטר ל-ViewSets. ראוטרים מטפלים אוטומטית ביצירת נתיבים עבור CRUD (List, Retrieve, Create, Update, Delete)
router = DefaultRouter()
router.register(r'seats', SeatViewSet, basename='seat') # /api/seats/
router.register(r'seating-maps', SeatingMapRetrieveViewSet, basename='seating-map') # /api/seating-maps/

urlpatterns = router.urls
