# tickets/serializers.py
from rest_framework import serializers
from .models import Order, Ticket  # Import Ticket model directly
from events.models import Event, PricingTier
from venues.models import SeatingMap
from django.db import transaction
from django.utils import timezone
from django.db.models import Q
from django.apps import apps
from decimal import Decimal

class PricingTierSerializerForTickets(serializers.ModelSerializer):
    class Meta:
        model = PricingTier
        fields = ['id', 'name', 'price']
        read_only_fields = ['id', 'name', 'price']


class TicketSerializer(serializers.ModelSerializer):
    event_details = serializers.SerializerMethodField()
    owner_username = serializers.ReadOnlyField(source='owner.username')
    pricing_tier_info = PricingTierSerializerForTickets(source='pricing_tier', read_only=True)

    class Meta:
        model = Ticket
        fields = ['id', 'event', 'price', 'is_scanned', 'ticket_code', 'event_details', 'owner_username', 'used_at',
                  'pricing_tier', 'pricing_tier_info', 'seat_assigned']
        read_only_fields = ['id', 'is_scanned', 'ticket_code', 'used_at', 'price']  # Removed 'status'

    def get_event_details(self, obj):
        from events.serializers import EventSerializer
        return EventSerializer(obj.event).data


class OrderSerializer(serializers.ModelSerializer):
    buyer_username = serializers.ReadOnlyField(source='buyer.username')
    tickets = TicketSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'buyer', 'buyer_username', 'ordered_at', 'total_amount', 'quantity', 'tickets']
        read_only_fields = ['id', 'buyer', 'buyer_username', 'ordered_at', 'total_amount',
                            'quantity']


class PurchaseTicketsSerializer(serializers.Serializer):
    event_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    selected_seats = serializers.ListField(
        child=serializers.IntegerField(),  # Expecting seat IDs (integers)
        required=False, allow_empty=True,
        help_text="List of seat IDs (e.g., 41, 50). Required for events with seating maps."
    )

    def validate_event_id(self, value):
        try:
            event = Event.objects.get(id=value)
        except Event.DoesNotExist:
            print(f"DEBUG (PurchaseTicketsSerializer.validate_event_id): Event ID {value} not found.")
            raise serializers.ValidationError("אירוע לא נמצא.")

        if event.is_cancelled:
            raise serializers.ValidationError(f"אירוע זה מבוטל ולא ניתן לרכוש עבורו כרטיסים.")

        if event.start_date < timezone.now():
            raise serializers.ValidationError("אירוע זה כבר החל או הסתיים.")

        return event

    def validate(self, data):
        event = data['event_id']
        quantity = data['quantity']
        selected_seat_ids = data.get('selected_seats', [])
        user = self.context['request'].user

        has_seating_map = SeatingMap.objects.filter(venue=event.venue).exists()
        print(
            f"DEBUG (PurchaseTicketsSerializer.validate): Event {event.id}, Venue {event.venue.id}, Has seating map: {has_seating_map}")

        if has_seating_map:
            if not selected_seat_ids:
                raise serializers.ValidationError({"selected_seats": "בחירת כיסאות נדרשת עבור אירוע זה."})
            if len(selected_seat_ids) != quantity:
                raise serializers.ValidationError({"quantity": "מספר הכיסאות שנבחרו אינו תואם את הכמות המבוקשת."})
        else:
            if selected_seat_ids:
                raise serializers.ValidationError({"selected_seats": "בחירת כיסאות אינה ישימה עבור אירוע זה."})

        print(
            f"DEBUG (PurchaseTicketsSerializer.validate): Checking global available seats for Event {event.id}. Current: {event.available_seats_count}, Requested: {quantity}.")
        if event.available_seats_count < quantity:
            print(f"DEBUG (PurchaseTicketsSerializer.validate): Not enough global available seats.")
            raise serializers.ValidationError({"quantity": "אין מספיק כרטיסים זמינים לאירוע זה."})

        if has_seating_map:
            Seat = apps.get_model('seats', 'Seat')

            print(
                f"DEBUG (PurchaseTicketsSerializer.validate): Before query - selected_seat_ids: {selected_seat_ids}, User ID: {user.id if user.is_authenticated else 'Anonymous'}, Current time: {timezone.now()}")

            # Filter for seats that are AVAILABLE or RESERVED by the current user and not expired
            available_or_reserved_seats = Seat.objects.filter(
                event=event,
                id__in=selected_seat_ids
            ).filter(
                Q(status=Seat.AVAILABLE) |
                Q(status=Seat.RESERVED, reserved_by=user, reservation_expiry__gte=timezone.now())
            )

            print(
                f"DEBUG (PurchaseTicketsSerializer.validate): After query - Found {available_or_reserved_seats.count()} available or self-reserved seats out of {quantity} requested.")
            for seat_obj in available_or_reserved_seats:
                print(
                    f"  Found Seat - ID: {seat_obj.id}, Section: {seat_obj.section}, Row: {seat_obj.row_number}, Num: {seat_obj.seat_number}, Status: {seat_obj.status}, Reserved By: {seat_obj.reserved_by_id}, Expiry: {seat_obj.reservation_expiry}")

            if available_or_reserved_seats.count() != quantity:
                problematic_seat_ids = set(selected_seat_ids) - set(
                    available_or_reserved_seats.values_list('id', flat=True))

                problematic_seats_objs = Seat.objects.filter(id__in=list(problematic_seat_ids))
                problematic_identifiers = [
                    f"{s.section}-{s.row_number}-{s.seat_number} (status: {s.get_status_display()})"
                    for s in problematic_seats_objs
                ]

                if problematic_identifiers:
                    raise serializers.ValidationError(
                        {
                            "selected_seats": f"אחד או יותר מהכיסאות שנבחרו אינם זמינים כעת או אינם תואמים לאירוע: {', '.join(problematic_identifiers)}"}
                    )
                else:
                    raise serializers.ValidationError(
                        "אחד או יותר מהכיסאות שנבחרו אינם זמינים כעת או אינם תואמים לאירוע.")

            data['seat_objects'] = available_or_reserved_seats

        data['event'] = event
        return data

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user
        event = validated_data['event']
        quantity = validated_data['quantity']
        seat_objects_to_update = validated_data.get('seat_objects', [])

        now = timezone.now()
        ticket_price = event.price

        selected_tier = None
        if hasattr(event, 'pricing_tiers') and event.pricing_tiers.exists():
            active_tiers = event.pricing_tiers.filter(
                start_date__lte=now
            ).filter(
                Q(end_date__gte=now) | Q(end_date__isnull=True)
            ).order_by('price', 'start_date')

            for tier in active_tiers:
                tier.refresh_from_db()
                tickets_sold_for_this_tier = tier.tickets_purchased_in_tier.count()

                if tier.quantity_threshold > 0 and tickets_sold_for_this_tier >= tier.quantity_threshold:
                    print(
                        f"DEBUG (PurchaseTicketsSerializer.create): Tier '{tier.name}' (ID: {tier.id}) exhausted by quantity. Skipping.")
                    continue

                selected_tier = tier
                ticket_price = tier.price
                print(f"DEBUG (PurchaseTicketsSerializer.create): Selected tier: '{tier.name}' (Price: {tier.price})")
                break

        event.refresh_from_db()
        if event.available_seats_count < quantity:
            raise serializers.ValidationError({"quantity": "אין מספיק כרטיסים זמינים לאירוע זה כרגע. אנא נסה שוב."})

        order = Order.objects.create(
            buyer=user,
            total_amount=Decimal('0.00'),
            quantity=quantity
        )
        print(f"DEBUG (PurchaseTicketsSerializer.create): Order {order.id} created for {quantity} tickets.")

        tickets_to_create = []
        Seat = apps.get_model('seats', 'Seat')

        has_seating_map = SeatingMap.objects.filter(venue=event.venue).exists()

        if has_seating_map and seat_objects_to_update:
            for seat_obj in seat_objects_to_update:
                seat_obj.status = Seat.SOLD
                seat_obj.reserved_by = None
                seat_obj.reservation_expiry = None
                tickets_to_create.append(
                    Ticket(
                        order=order,
                        event=event,
                        owner=user,
                        price=ticket_price,
                        pricing_tier=selected_tier,
                        seat_assigned=seat_obj  # *** תיקון קריטי: העברת אובייקט Seat ל-seat_assigned ***
                        # Removed 'status' as it doesn't exist on Ticket model
                    )
                )
            Seat.objects.bulk_update(seat_objects_to_update, ['status', 'reserved_by', 'reservation_expiry'])
            print(
                f"DEBUG (PurchaseTicketsSerializer.create): {len(seat_objects_to_update)} specific seats marked as SOLD.")

        else:  # For general admission tickets
            for _ in range(quantity):
                tickets_to_create.append(
                    Ticket(
                        order=order,
                        event=event,
                        owner=user,
                        price=ticket_price,
                        pricing_tier=selected_tier,
                        # For general admission, seat_assigned should be None
                        # No seat_number, as it's not a field on Ticket
                        # No status field on Ticket
                    )
                )

        Ticket.objects.bulk_create(tickets_to_create)
        print(f"DEBUG (PurchaseTicketsSerializer.create): {len(tickets_to_create)} tickets bulk created.")

        order.total_amount = sum(t.price for t in tickets_to_create)
        # Note: The Order model does not have a 'status' field in your tickets/models.py
        # You might want to add status to Order model if you need it.
        # For now, I'm removing order.status = Order.COMPLETED to prevent errors.
        # If Order needs a status, define it in tickets/models.py first.
        # order.status = Order.COMPLETED # THIS LINE WILL CAUSE ERROR IF Order.status DOES NOT EXIST
        order.save(update_fields=['total_amount', 'quantity'])  # Updated fields to reflect changes correctly
        print(
            f"DEBUG (PurchaseTicketsSerializer.create): Order {order.id} total amount updated to {order.total_amount} and quantity to {order.quantity}.")

        return order


class TicketScanSerializer(serializers.Serializer):
    ticket_code = serializers.CharField(max_length=255)

    def validate_ticket_code(self, value):
        try:
            ticket = Ticket.objects.get(ticket_code=value)
        except Ticket.DoesNotExist:
            raise serializers.ValidationError("קוד כרטיס לא חוקי.")

        if ticket.is_scanned:
            raise serializers.ValidationError("כרטיס זה כבר נסרק.")

        if ticket.event.is_cancelled:
            raise serializers.ValidationError("האירוע מבוטל, הכרטיס אינו תקף.")

        if ticket.event.start_date > timezone.now():
            raise serializers.ValidationError("האירוע עדיין לא החל.")
        if ticket.event.start_date < timezone.now() and ticket.event.end_date and ticket.event.end_date < timezone.now():
            raise serializers.ValidationError("האירוע כבר הסתיים.")

        return value

    def create(self, validated_data):
        ticket = Ticket.objects.get(ticket_code=validated_data['ticket_code'])
        ticket.is_scanned = True
        ticket.used_at = timezone.now()
        ticket.save()
        return ticket
