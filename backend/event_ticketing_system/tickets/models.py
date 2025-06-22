# tickets/models.py
from django.db import models
from django.utils import timezone
import uuid
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
from django.conf import settings  # <--- חדש: ייבוא settings
from django.apps import apps  # <--- חדש: ייבוא apps לטעינה בטוחה של מודלים

class Order(models.Model):
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    ordered_at = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    quantity = models.IntegerField(default=0)

    def __str__(self):
        User = apps.get_model(settings.AUTH_USER_MODEL.split('.')[0], settings.AUTH_USER_MODEL.split('.')[1])
        try:
            buyer_obj = User.objects.get(pk=self.buyer_id)  # נסה להשיג את המשתמש
            username = buyer_obj.username
        except User.DoesNotExist:
            username = "Unknown User"  # אם המשתמש לא קיים (נמחק), או בעיית טעינה

        return f"Order {self.id} by {username}"

    class Meta:
        ordering = ['-ordered_at']
        verbose_name_plural = "Orders"


class Ticket(models.Model):
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='tickets_sold')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='tickets')
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_tickets')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    pricing_tier = models.ForeignKey(
        'events.PricingTier',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tickets_purchased_in_tier'
    )
    ticket_code = models.CharField(max_length=50, unique=True, default=uuid.uuid4)
    is_scanned = models.BooleanField(default=False) # Only is_scanned, no general 'status' field
    used_at = models.DateTimeField(null=True, blank=True)
    seat_assigned = models.OneToOneField(
        'seats.Seat',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_ticket',
        help_text="הכיסא הספציפי המשויך לכרטיס זה."
    )

    def __str__(self):
        Event = apps.get_model('events', 'Event')
        Seat = apps.get_model('seats', 'Seat')

        event_obj = None
        try:
            event_obj = Event.objects.get(pk=self.event_id)
        except Event.DoesNotExist:
            pass  # אם האירוע נמחק, או עדיין לא נטען

        seat_info = "אין כיסא"
        if self.seat_assigned:  # ודא ש-self.seat_assigned קיים
            try:
                # נטען את אובייקט Seat מחדש (אם הוא נטען מוקדם מדי)
                seat_obj = Seat.objects.get(pk=self.seat_assigned_id)
                seat_info = f"כיסא {seat_obj.seat_number} בשורה {seat_obj.row_number} (סקשן {seat_obj.section})"
            except Seat.DoesNotExist:
                pass  # אם הכיסא לא קיים

        event_title = event_obj.title if event_obj else "אירוע לא ידוע"
        tier_name = self.pricing_tier.name if self.pricing_tier else "ברירת מחדל"

        return f"כרטיס עבור {event_title} ({self.ticket_code}) - רמה: {tier_name} - {seat_info}"

    def generate_barcode(self):
        self.ticket_code = str(uuid.uuid4())

    def save(self, *args, **kwargs):
        if not self.ticket_code:  # שימוש ב-ticket_code במקום barcode
            self.generate_barcode()
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['event__title', 'ticket_code']
        verbose_name_plural = "Tickets"
        unique_together = ('event', 'ticket_code')

@receiver(post_save, sender='tickets.Ticket')  # <--- שינוי: שימוש במחרוזת עבור sender
def update_order_on_ticket_save(sender, instance, created, **kwargs):
    if created:
        with transaction.atomic():
            order = instance.order
            order.refresh_from_db()
            order.quantity = order.tickets.count()
            order.total_amount = sum(ticket.price for ticket in order.tickets.all())
            order.save(update_fields=['quantity', 'total_amount'])
            print(
                f"DEBUG: Order {order.id} updated after ticket {instance.id} created. New quantity: {order.quantity}, total: {order.total_amount}")

@receiver(post_delete, sender='tickets.Ticket')  # <--- שינוי: שימוש במחרוזת עבור sender
def update_order_on_ticket_delete(sender, instance, **kwargs):
    if instance.order:
        with transaction.atomic():
            order = instance.order
            order.refresh_from_db()
            order.quantity = order.tickets.count()
            order.total_amount = sum(ticket.price for ticket in order.tickets.all())
            order.save(update_fields=['quantity', 'total_amount'])
            print(
                f"DEBUG: Order {order.id} updated after ticket {instance.id} deleted. New quantity: {order.quantity}, total: {order.total_amount}")
    else:
        print(f"DEBUG: Ticket {instance.id} deleted, but associated order was already null/deleted.")


