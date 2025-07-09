# venues/admin.py
from django.contrib import admin
from .models import Venue, SeatingMap # ייבוא המודלים Venue ו-SeatingMap

@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'capacity', 'created_at')
    search_fields = ('name', 'address', 'city')
    list_filter = ('city', 'country')
    ordering = ('name',)

@admin.register(SeatingMap)
class SeatingMapAdmin(admin.ModelAdmin):
    list_display = ('venue', 'created_at', 'updated_at')
    search_fields = ('venue__name',)

