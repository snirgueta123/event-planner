# tickets/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Order, Ticket
from .serializers import OrderSerializer, TicketSerializer, TicketScanSerializer, PurchaseTicketsSerializer, PricingTierSerializerForTickets
from events.models import Event, PricingTier # Make sure Event and PricingTier are imported
from django.db import transaction  # Import transaction
from django.utils import timezone  # Import timezone, needed for Ticket.used_at
from rest_framework.pagination import PageNumberPagination
import qrcode
from io import BytesIO
from django.http import HttpResponse

class OrderPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    pagination_class = OrderPagination

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'create', 'purchase_tickets']:
            permission_classes = [permissions.IsAuthenticated]
        else:  # For update, partial_update, destroy
            permission_classes = [permissions.IsAdminUser]  # Admin for modifying/deleting orders directly
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'purchase_tickets': # Use PurchaseTicketsSerializer for this action
            return PurchaseTicketsSerializer
        return OrderSerializer # Default for other actions

    def get_queryset(self):
        if self.request.user.is_staff:
            return Order.objects.all().prefetch_related('tickets')
        return Order.objects.filter(buyer=self.request.user).prefetch_related('tickets')

    @action(detail=False, methods=['post'], serializer_class=PurchaseTicketsSerializer)
    def purchase_tickets(self, request):
        serializer = self.get_serializer(data=request.data, context={'request': request}) # Pass request to serializer context
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        output_serializer = OrderSerializer(order)  # Use OrderSerializer to return order details
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        with transaction.atomic():
            tickets_in_order = Ticket.objects.filter(order=instance)
            for ticket in tickets_in_order:
                event = ticket.event
                # Ensure the event has 'available_tickets' before attempting to increase it
                if hasattr(event, 'available_tickets') and event.available_tickets is not None:
                    event.available_tickets += 1
                    event.save()
            # Finally, delete the order itself (related tickets will be deleted automatically via CASCADE)
            instance.delete()

class TicketViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    pagination_class = PageNumberPagination

    def get_permissions(self):
        if self.action in ['retrieve', 'mark_used']:
            return [permissions.IsAuthenticated()]
        elif self.action == 'list':
            return [permissions.IsAuthenticated()] # Authenticated users can list their tickets
        else:
            return [permissions.IsAdminUser()] # Default for other actions

    def get_queryset(self):
        if self.request.user.is_staff:
            return Ticket.objects.all()
        return Ticket.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        if self.action == 'mark_used':
            return TicketScanSerializer
        return TicketSerializer

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def mark_used(self, request, pk=None):
        try:
            ticket = self.get_object()
        except Ticket.DoesNotExist:
            return Response({'error': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

        if ticket.is_scanned:
            return Response({'message': 'Ticket already used.'}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure the ticket is not null and has an event.
        if not ticket.event:
             return Response({'error': 'Ticket is not associated with an event.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if the associated event is cancelled
        if hasattr(ticket.event, 'is_cancelled') and ticket.event.is_cancelled:
            return Response({'error': 'Cannot use ticket for a cancelled event.'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.is_scanned = True
        ticket.used_at = timezone.now()
        ticket.save()

        serializer = self.get_serializer(ticket)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='by_order/(?P<order_id>[^/.]+)',
            permission_classes=[permissions.IsAuthenticated])
    def tickets_by_order(self, request, order_id=None):
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'ההזמנה לא קיימת.'}, status=404)

        if not request.user.is_staff and order.buyer != request.user:
            return Response({'error': 'אין לך הרשאה לצפות בכרטיסים של הזמנה זו.'}, status=403)

        tickets = Ticket.objects.filter(order=order)
        serializer = self.get_serializer(tickets, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='qr', permission_classes=[permissions.IsAuthenticated])
    def generate_qr(self, request, pk=None):
        ticket = self.get_object()

        if not request.user.is_staff and ticket.owner != request.user:
            return Response({'error': 'אין לך גישה לכרטיס זה.'}, status=status.HTTP_403_FORBIDDEN)

        qr_data = f"{ticket.ticket_code}"
        qr = qrcode.make(qr_data)
        buffer = BytesIO()
        qr.save(buffer, format='PNG')
        buffer.seek(0)

        return HttpResponse(buffer.getvalue(), content_type='image/png')

