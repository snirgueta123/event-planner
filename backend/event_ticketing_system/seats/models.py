# seats/models.py
from django.db import models
from django.utils import timezone
import datetime
from django.conf import settings
from venues.models import Venue


class Seat(models.Model):
    AVAILABLE = 'available'
    RESERVED = 'reserved'
    SOLD = 'sold'
    STATUS_CHOICES = [
        (AVAILABLE, 'Available'),
        (RESERVED, 'reserved'),
        (SOLD, 'Sold'),
    ]

    event = models.ForeignKey(
        'events.Event',
        on_delete=models.CASCADE,
        related_name='seats'
    )
    venue = models.ForeignKey(Venue, on_delete=models.CASCADE, related_name='seats')
    section = models.CharField(max_length=100)
    row_number = models.CharField(max_length=10)
    seat_number = models.CharField(max_length=10)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=AVAILABLE)

    reserved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reserved_seats'
    )
    reservation_expiry = models.DateTimeField(null=True, blank=True)

    ticket = models.OneToOneField(
        'tickets.Ticket',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='seat_assignment'
    )

    class Meta:
        unique_together = ('event', 'section', 'row_number', 'seat_number')
        ordering = ['event', 'section', 'row_number', 'seat_number']

    def __str__(self):
        return f"Seat {self.seat_number} in Row {self.row_number}, Section {self.section} for Event: {self.event.title}"

    def is_reserved(self):
        return self.status == self.RESERVED and \
            self.reservation_expiry and \
            self.reservation_expiry > timezone.now()

    def clean(self):
        if self.event:
            pass

    def save(self, *args, **kwargs):
        if self.status == self.AVAILABLE:
            self.reserved_by = None
            self.reservation_expiry = None

        if self.status == self.SOLD:
            self.reserved_by = None
            self.reservation_expiry = None

        super().save(*args, **kwargs)


