# seats/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
import datetime

from .models import Seat
from .serializers import SeatSerializer
from venues.models import SeatingMap
from venues.serializers import SeatingMapSerializer
from events.models import Event
from tickets.models import Ticket, Order


class SeatViewSet(viewsets.ModelViewSet):
    """
    ViewSet עבור מודל Seat.
    מאפשר קבלת רשימת כיסאות וניהול סטטוס כיסא (שמירה/ביטול שמירה).
    """
    queryset = Seat.objects.all().select_related('event', 'venue', 'reserved_by', 'ticket')
    serializer_class = SeatSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        """
        מאפשר סינון כיסאות לפי event_id.
        לדוגמה: /api/seats/?event_id=123
        """
        queryset = super().get_queryset()
        event_id = self.request.query_params.get('event_id')
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        return queryset

    # GET: /api/seats/{seat_id}/
    def retrieve(self, request, *args, **kwargs):
        """
        קבלת פרטים על כיסא ספציפי.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    # POST: /api/seats/{seat_id}/reserve/
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reserve(self, request, pk=None):
        """
        פעולה לשמירת כיסא.
        כיסא יישמר למשך זמן מוגבל (לדוגמה, 15 דקות).
        """
        seat = get_object_or_404(Seat, pk=pk)
        user = request.user

        if seat.status != Seat.AVAILABLE:
            return Response(
                {"detail": "This seat is not available for reservation."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            seat.status = Seat.RESERVED
            seat.reserved_by = user
            seat.reservation_expiry = timezone.now() + datetime.timedelta(minutes=15)
            seat.save()

            serializer = self.get_serializer(seat)
            return Response(serializer.data, status=status.HTTP_200_OK)

    # POST: /api/seats/{seat_id}/unreserve/
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def unreserve(self, request, pk=None):
        """
        פעולה לביטול שמירה של כיסא.
        """
        seat = get_object_or_404(Seat, pk=pk)
        user = request.user

        if seat.status != Seat.RESERVED or (seat.reserved_by != user and not user.is_staff):
            return Response(
                {"detail": "This seat is not reserved by you or is not in a reserved state."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            seat.status = Seat.AVAILABLE
            seat.reserved_by = None
            seat.reservation_expiry = None
            seat.save()

            serializer = self.get_serializer(seat)
            return Response(serializer.data, status=status.HTTP_200_OK)

    # POST: /api/seats/{seat_id}/purchase/
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def purchase(self, request, pk=None):
        """
        פעולה לרכישת כיסא (סימון כיסא כמכור).
        זה יכלול יצירת אובייקט Ticket וקישורו לכיסא.
        """
        seat = get_object_or_404(Seat, pk=pk)
        user = request.user

        if seat.status == Seat.SOLD:
            return Response(
                {"detail": "This seat is already sold."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if seat.status == Seat.RESERVED and seat.reserved_by != user:
            return Response(
                {"detail": "This seat is reserved by another user."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if seat.status == Seat.RESERVED and seat.reservation_expiry < timezone.now():
            return Response(
                {"detail": "Your reservation for this seat has expired."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            if seat.ticket:
                return Response(
                    {"detail": "This seat is already associated with a ticket."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            order, created = Order.objects.get_or_create(
                buyer=user,
                defaults={'total_amount': 0, 'quantity': 0}
            )

            event_price = seat.event.price

            ticket = Ticket.objects.create(
                order=order,
                event=seat.event,
                owner=user,
                price=event_price,
                seat_assigned=seat,
            )

            seat.status = Seat.SOLD
            seat.reserved_by = None
            seat.reservation_expiry = None
            seat.ticket = ticket
            seat.save()

            serializer = self.get_serializer(seat)
            return Response(serializer.data, status=status.HTTP_200_OK)

    # POST: /api/seats/{seat_id}/release/
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def release(self, request, pk=None):
        """
        פעולה לשחרור כיסא שנמכר והחזרתו למצב זמין לרכישה.
        פעולה זו מוחקת גם את הכרטיס המשויך לכיסא.
        """
        seat = get_object_or_404(Seat, pk=pk)
        user = request.user

        if seat.status != Seat.SOLD:
            return Response(
                {"detail": "This seat is not currently sold and cannot be released."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            if seat.ticket:
                ticket_to_delete = seat.ticket
                seat.ticket = None
                seat.save()
                ticket_to_delete.delete()

            seat.status = Seat.AVAILABLE
            seat.reserved_by = None
            seat.reservation_expiry = None
            seat.save()

            serializer = self.get_serializer(seat)
            return Response(serializer.data, status=status.HTTP_200_OK)


class SeatingMapRetrieveViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet לקבלת מפת ישיבה עבור אולם ספציפי (קריאה בלבד).
    """
    queryset = SeatingMap.objects.all().select_related('venue')
    serializer_class = SeatingMapSerializer
    permission_classes = [AllowAny]

    # GET: /api/seating-maps/by_venue/{venue_id}/
    @action(detail=False, methods=['get'])
    def by_venue(self, request):
        """
        מחזיר את מפת הישיבה עבור venue_id נתון.
        """
        venue_id = self.request.query_params.get('venue_id')
        if not venue_id:
            return Response({"detail": "venue_id parameter is required."}, status=status.HTTP_400_BAD_REQUEST)

        seating_map = get_object_or_404(SeatingMap, venue__id=venue_id)
        serializer = self.get_serializer(seating_map)
        return Response(serializer.data)
