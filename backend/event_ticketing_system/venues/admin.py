# venues/admin.py
from django.contrib import admin
from .models import Venue, SeatingMap # ייבוא המודלים Venue ו-SeatingMap


@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'capacity', 'created_at')
    search_fields = ('name', 'address', 'city')
    list_filter = ('city', 'country')
    ordering = ('name',) # מיון לפי שם האולם כברירת מחדל
    # כדי להציג את ה-SeatingMap המשויך ישירות מתוך עמוד ה-Venue
    # ניתן להוסיף inline, אך זה דורש שיהיה רק SeatingMap אחד לכל Venue
    # class SeatingMapInline(admin.StackedInline):
    #     model = SeatingMap
    #     can_delete = False
    #     verbose_name_plural = 'seating map'
    #     fk_name = 'venue'
    # inlines = [SeatingMapInline]

@admin.register(SeatingMap)
class SeatingMapAdmin(admin.ModelAdmin):
    list_display = ('venue', 'created_at', 'updated_at')
    search_fields = ('venue__name',) # חיפוש לפי שם האולם המשויך
    # ה-JSONField layout_data יוצג כ-textarea גדול באדמין,
    # שזה בסדר בשלב זה.

