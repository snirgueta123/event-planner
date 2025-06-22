# backend/venues/urls.py
from django.urls import path
from .views import VenueListCreateView, VenueDetailView, SeatingMapListCreateView, SeatingMapDetailView, SeatingMapByVenueView # <--- ייבוא SeatingMapByVenueView

urlpatterns = [
    path('', VenueListCreateView.as_view(), name='venue-list-create'),
    path('<int:pk>/', VenueDetailView.as_view(), name='venue-detail'),
    path('seating-maps/', SeatingMapListCreateView.as_view(), name='seating-map-list-create'),
    path('seating-maps/<int:pk>/', SeatingMapDetailView.as_view(), name='seating-map-detail'),
    path('seating-maps/by_venue/', SeatingMapByVenueView.as_view(), name='seating-map-by-venue'), # <--- נתיב חדש
]

