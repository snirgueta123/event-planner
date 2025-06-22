# events/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from django.db.models import Q, F
import re
from django.utils import timezone
from .models import Event, PricingTier
from .serializers import EventSerializer, EventCreateSerializer, \
    EventUpdateSerializer, PricingTierSerializer
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters


# הגדרת פאגינציה מותאמת אישית
class EventPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


# הגדרת הרשאה מותאמת אישית ל-IsOrganizerOrAdmin
class IsOrganizerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_staff:
            return True
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.organizer == request.user


# פונקציית עזר לחילוץ שם העיר
def get_city_from_location(location_string):
    """
    מנסה לחלץ שם עיר מתוך מחרוזת כתובת.
    זוהי לוגיקה פשוטה המבוססת על ההנחה שהעיר היא החלק האחרון אחרי פסיק,
    או מילה יחידה אם אין פסיקים.
    ניתן לשפר זאת עם רשימת ערים ידועות או שירותי Geocoding.
    """
    if not location_string:
        return None

    parts = [part.strip() for part in location_string.split(',')]
    if parts:
        city = parts[-1]
        city = re.sub(r'\s*\d+$', '', city).strip()
        if city.isdigit():
            return None
        return city
    return None


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    pagination_class = EventPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category', 'city_name']
    search_fields = ['title', 'description']

    def get_serializer_class(self):
        if self.action == 'create':
            return EventCreateSerializer
        if self.action in ['update', 'partial_update']:
            return EventUpdateSerializer
        return EventSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'current_price']:
            permission_classes = [permissions.AllowAny]
        elif self.action in ['create', 'my_events', 'cancel_event']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy', 'event_pricing_tiers',
                             'event_pricing_tier_detail']:
            permission_classes = [permissions.IsAuthenticated, IsOrganizerOrAdmin]
        else:
            permission_classes = [permissions.IsAdminUser]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)

    def perform_update(self, serializer):
        location_input = serializer.validated_data.get('location')
        if location_input is None:
            location_input = self.get_object().location

        city_name = get_city_from_location(location_input)

        serializer.validated_data['city_name'] = city_name
        serializer.save()

    def get_queryset(self):
        return super().get_queryset()

    @action(detail=False, methods=['get'])
    def my_events(self, request):
        events = self.filter_queryset(self.get_queryset()).filter(organizer=request.user)

        page = self.paginate_queryset(events)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(events, many=True)
        return Response({'results': serializer.data})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def cancel_event(self, request, pk=None):
        try:
            event = self.get_object()
        except Event.DoesNotExist:
            return Response({'error': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not (request.user.is_staff or event.organizer == request.user):
            return Response({'error': 'You do not have permission to cancel this event.'},
                            status=status.HTTP_403_FORBIDDEN)

        if event.is_cancelled:
            return Response({'message': 'Event is already cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        event.is_cancelled = True
        event.save()

        return Response({'message': 'Event cancelled successfully.'}, status=status.HTTP_200_OK)

    # נקודות קצה לניהול שכבות תמחור ספציפיות לאירוע
    @action(detail=True, methods=['get', 'post'], url_path='pricing-tiers')
    def event_pricing_tiers(self, request, pk=None):
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)

        if not (request.user.is_staff or event.organizer == request.user):
            return Response({'error': 'You do not have permission to manage pricing tiers for this event.'},
                            status=status.HTTP_403_FORBIDDEN)

        if request.method == 'GET':
            tiers = event.pricing_tiers.all()
            serializer = PricingTierSerializer(tiers, many=True)
            return Response(serializer.data)

        elif request.method == 'POST':
            serializer = PricingTierSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(event=event)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['put', 'delete'], url_path='pricing-tiers/(?P<tier_pk>[^/.]+)')
    def event_pricing_tier_detail(self, request, pk=None, tier_pk=None):
        try:
            event = Event.objects.get(pk=pk)
            tier = event.pricing_tiers.get(pk=tier_pk)
        except Event.DoesNotExist:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)
        except PricingTier.DoesNotExist:
            return Response({"detail": "Pricing tier not found for this event."}, status=status.HTTP_404_NOT_FOUND)

        if not (request.user.is_staff or event.organizer == request.user):
            return Response({'error': 'You do not have permission to manage pricing tiers for this event.'},
                            status=status.HTTP_403_FORBIDDEN)

        if request.method == 'PUT':
            serializer = PricingTierSerializer(tier, data=request.data, partial=False)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        elif request.method == 'DELETE':
            tier.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

    # פונקציה לקבלת המחיר הנוכחי של כרטיס לאירוע (לוגיקת תמחור דינמי)
    @action(detail=True, methods=['get'])
    def current_price(self, request, pk=None):
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            print(f"DEBUG (current_price): Event with pk {pk} not found.")
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        print(f"DEBUG (current_price): Current server time is {now}")

        active_tiers_query = event.pricing_tiers.filter(
            start_date__lte=now
        ).filter(
            Q(end_date__gte=now) | Q(end_date__isnull=True)
        ).order_by('price', 'start_date')

        active_tiers_list = list(active_tiers_query)
        print(
            f"DEBUG (current_price): Found {len(active_tiers_list)} potential date-active tiers for Event {event.title} (ID: {event.id}).")

        for debug_tier in active_tiers_list:
            print(
                f"DEBUG (current_price): Queryset Tier: '{debug_tier.name}', Price: {debug_tier.price}, Start: {debug_tier.start_date}, End: {debug_tier.end_date}, Threshold: {debug_tier.quantity_threshold}")

        current_active_tier = None
        for i, tier in enumerate(active_tiers_list):
            tier.refresh_from_db()

            tickets_sold_for_this_tier = tier.tickets_purchased_in_tier.count()

            print(f"DEBUG (current_price): --- Processing Tier {i + 1}: '{tier.name}' (ID: {tier.id}) ---")
            print(
                f"DEBUG (current_price):  Price: {tier.price}, Start: {tier.start_date}, End: {tier.end_date}, Threshold: {tier.quantity_threshold}")
            print(f"DEBUG (current_price):  Tickets sold for this tier: {tickets_sold_for_this_tier}")

            if tier.quantity_threshold > 0 and tickets_sold_for_this_tier >= tier.quantity_threshold:
                print(
                    f"DEBUG (current_price): Tier '{tier.name}' (ID: {tier.id}) exhausted by quantity ({tickets_sold_for_this_tier}/{tier.quantity_threshold}). Skipping to next tier.")
                continue
            else:
                current_active_tier = tier
                print(
                    f"DEBUG (current_price): SELECTED TIER: '{tier.name}' (Price: {tier.price}). Breaking loop as this is the first valid tier.")
                break

        if current_active_tier:
            final_response_data = {
                "price": current_active_tier.price,
                "tier_name": current_active_tier.name,
                "is_dynamic_price": True
            }
            print(f"DEBUG (current_price): Final API Response Data: {final_response_data}")
            return Response(final_response_data)
        else:
            final_response_data = {
                "price": event.price,
                "tier_name": "Default",
                "is_dynamic_price": False
            }
            print(
                f"DEBUG (current_price): No dynamic tier found active for {event.title}. Falling back. Final API Response Data: {final_response_data}")
            return Response(final_response_data)


# --- Views פונקציונליים נפרדים לקטגוריות ומיקומים ---
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_categories_list(request):
    """
    Returns a list of all unique event categories.
    If no events exist, provides a default set of categories.
    """
    categories = Event.objects.values_list('category', flat=True).distinct().exclude(category__isnull=True).exclude(
        category__exact='').order_by('category')

    # *** שינוי קריטי: אם אין קטגוריות, ספק רשימת ברירת מחדל ***
    if not categories:
        default_categories = ['Concert', 'Sport', 'Theater', 'Conference', 'Workshop', 'Exhibition']
        return Response(default_categories)

    return Response(list(categories))


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_locations_list(request):
    """
    Returns a list of all unique event city names (locations).
    """
    locations = Event.objects.values_list('city_name', flat=True).distinct().exclude(city_name__isnull=True).exclude(
        city_name__exact='').order_by('city_name')
    return Response(list(locations))
