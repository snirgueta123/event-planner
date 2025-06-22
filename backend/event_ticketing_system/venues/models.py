# venues/models.py
from django.db import models
from django.db.models import JSONField


class Venue(models.Model):
    name = models.CharField(max_length=255, unique=True)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default='ישראל')
    capacity = models.IntegerField(null=True, blank=True,
                                   help_text="קיבולת כללית של האולם. לא חובה אם משתמשים במפת ישיבה.")
    description = models.TextField(blank=True, null=True)
    image_url = models.URLField(max_length=500, blank=True, null=True,
                                 help_text="כתובת URL לתמונה של האולם")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Venue"
        verbose_name_plural = "Venues"

    def __str__(self):
        return self.name


class SeatingMap(models.Model):
    venue = models.OneToOneField(
        Venue,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='seating_map',
        help_text="האולם אליו שייכת מפת הישיבה (קשר אחד לאחד)"
    )
    layout_data = JSONField(
        default=dict,
        help_text="מבנה JSON המתאר את פריסת מפת הישיבה (אזורים, שורות, כיסאות)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Seating Map"
        verbose_name_plural = "Seating Maps"

    def __str__(self):
        return f"מפת ישיבה ל: {self.venue.name}"
