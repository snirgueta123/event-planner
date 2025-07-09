# config/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from events.views import EventViewSet, get_categories_list, get_locations_list
from tickets.views import OrderViewSet, TicketViewSet
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'ok', 'message': 'Backend is running'})

router = DefaultRouter()

router.register(r'events', EventViewSet, basename='event')
router.register(r'tickets/orders', OrderViewSet, basename='order')
router.register(r'tickets', TicketViewSet, basename='ticket')

urlpatterns = [
    path('', health_check),
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/events/categories/', get_categories_list, name='event-categories-list'),
    path('api/events/locations/', get_locations_list, name='event-locations-list'),
    path('api/events/<int:pk>/current-price/', EventViewSet.as_view({'get': 'current_price'}),
         name='event-current-price'),
    path('api/', include(router.urls)),
    path('api/', include('seats.urls')),
    path('api/venues/', include('venues.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
