# events/models.py
from django.db import models
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from django.core.exceptions import ValidationError
from django.conf import settings
from django.apps import apps # <--- חדש: ייבוא apps לטעינה בטוחה של מודלים

from venues.models import Venue
# OLD: from seats.models import Seat # <--- חשוב: יש להסיר שורה זו!


# הגדרת הקטגוריות האפשריות כקבועים
EVENT_CATEGORIES = [
    ('Concert', 'Concert'),
    ('Sport', 'Sport'),
    ('Conference', 'Conference'),
    ('Festival', 'Festival'),
    ('Music', 'Music'),
    ('Arts', 'Arts'),
    ('Technology', 'Technology'),
    ('Food', 'Food'),
    ('Education', 'Education'),
    ('Other', 'Other'),
]


class Event(models.Model):
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='organized_events'
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(blank=True, null=True)

    venue = models.ForeignKey(Venue, on_delete=models.SET_NULL, null=True, blank=True, related_name='events')

    location = models.CharField(max_length=255, blank=True, null=True)
    city_name = models.CharField(max_length=100, blank=True, null=True)

    category = models.CharField(
        max_length=50,
        choices=EVENT_CATEGORIES,
        default='Other'
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    image = models.ImageField(upload_to='event_images/', blank=True, null=True)
    is_cancelled = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if self.venue and self.venue.city:
            self.city_name = self.venue.city
        elif self.location and not self.city_name:
            import re
            parts = [part.strip() for part in self.location.split(',')]
            if parts:
                city = parts[-1]
                city = re.sub(r'\s*\d+$', '', city).strip()
                if city.isdigit():
                    self.city_name = None
                else:
                    self.city_name = city
            else:
                self.city_name = None
        elif not self.location and not self.venue:
            self.city_name = None

        super().save(*args, **kwargs)

    @property
    def total_seats(self):
        """מחזיר את המספר הכולל של כיסאות עבור אירוע זה."""
        Seat = apps.get_model('seats', 'Seat') # <--- חדש: טעינה בטוחה של מודל Seat
        return self.seats.count() # 'seats' הוא ה-related_name ממודל Seat

    @property
    def available_seats_count(self):
        """מחזיר את מספר הכיסאות הזמינים (סטטוס 'available') עבור אירוע זה."""
        Seat = apps.get_model('seats', 'Seat') # <--- חדש: טעינה בטוחה של מודל Seat
        return self.seats.filter(status=Seat.AVAILABLE).count()

    @property
    def sold_seats_count(self):
        """מחזיר את מספר הכיסאות שנמכרו (סטטוס 'sold') עבור אירוע זה."""
        Seat = apps.get_model('seats', 'Seat') # <--- חדש: טעינה בטוחה של מודל Seat
        return self.seats.filter(status=Seat.SOLD).count()


    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-start_date']
        verbose_name_plural = "Events"


class PricingTier(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='pricing_tiers')
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(blank=True, null=True)
    quantity_threshold = models.IntegerField(default=0)

    class Meta:
        ordering = ['event', 'start_date', 'price']
        verbose_name = "Pricing Tier"
        verbose_name_plural = "Pricing Tiers"

    def __str__(self):
        return f"{self.event.title} - {self.name} (${self.price})"

    def is_active(self):
        now = timezone.now()
        return (self.start_date is None or self.start_date <= now) and \
               (self.end_date is None or self.end_date >= now)

    def tickets_sold(self):
        from django.apps import apps
        Ticket = apps.get_model('tickets', 'Ticket')
        return Ticket.objects.filter(pricing_tier=self, status='sold').count()

    def tickets_remaining(self):
        if self.quantity_threshold is None:
            return None
        return self.quantity_threshold - self.tickets_sold()


# --- סיגנל ליצירת כיסאות באופן אוטומטי לאחר שמירת אירוע ---
@receiver(post_save, sender=Event)
def create_event_seats_on_save(sender, instance, created, **kwargs):
    """
    יוצר אובייקטי Seat עבור אירוע בהתבסס על מפת הישיבה של האולם המשויך אליו.
    זה רץ כאשר אירוע נוצר או מתעדכן.
    """
    # חשוב: יש לטעון את מודל Seat כאן בתוך הפונקציה
    from django.apps import apps
    Seat = apps.get_model('seats', 'Seat') # <--- חדש: טעינה בטוחה של מודל Seat

    if instance.venue and hasattr(instance.venue, 'seating_map'):
        try:
            seating_map = instance.venue.seating_map

            with transaction.atomic():
                Seat.objects.filter(event=instance).delete()
                print(f"DEBUG: Cleared existing seats for Event '{instance.title}' (ID: {instance.id}).")

                seats_to_create = []
                sections = seating_map.layout_data.get('sections', {})
                for section_name, section_data in sections.items():
                    rows = section_data.get('rows', {})
                    for row_name, seat_numbers in rows.items():
                        if isinstance(seat_numbers, list):
                            for seat_num in seat_numbers:
                                seats_to_create.append(
                                    Seat(
                                        event=instance,
                                        venue=instance.venue,
                                        section=section_name,
                                        row_number=row_name,
                                        seat_number=seat_num,
                                        status=Seat.AVAILABLE
                                    )
                                )

                if seats_to_create:
                    Seat.objects.bulk_create(seats_to_create)
                    print(
                        f"DEBUG: Successfully created {len(seats_to_create)} seats for Event '{instance.title}' (ID: {instance.id}).")
                else:
                    print(
                        f"DEBUG: No seats defined in SeatingMap for Event '{instance.title}' (ID: {instance.id}). Skipping seat creation.")

        except Exception as e:
            print(f"ERROR: Failed to create seats for Event '{instance.title}' (ID: {instance.id}). Error: {e}")
    elif instance.venue and not hasattr(instance.venue, 'seating_map'):
        print(
            f"DEBUG: Event '{instance.title}' (ID: {instance.id}) has a venue but no associated seating map. Skipping seat creation.")
    else:
        print(f"DEBUG: Event '{instance.title}' (ID: {instance.id}) has no venue assigned. Skipping seat creation.")

