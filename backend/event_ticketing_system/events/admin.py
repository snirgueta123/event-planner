# events/admin.py
from django.contrib import admin
from .models import Event, PricingTier # ייבוא מודלים אלה (User לא נמצא כאן)
from django.contrib.auth import get_user_model # <--- חדש: ייבוא get_user_model
from django.apps import apps # <--- חדש: ייבוא apps


# הגדרת אובייקט User (כך שיהיה זמין לשימוש באדמין אם צריך)
# אנחנו קוראים ל-get_user_model() רק אחרי שכל האפליקציות נטענו
# (במהלך הפעלת השרת) אז זה בטוח כאן
User = get_user_model() # <--- שימוש בטוח במודל המשתמש

class PricingTierInline(admin.TabularInline):
    model = PricingTier
    extra = 1
    fields = ['name', 'price', 'start_date', 'end_date', 'quantity_threshold']


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'organizer', 'start_date', 'end_date', 'venue', 'city_name', 'category',
        'price', 'is_cancelled', 'total_seats_display', 'available_seats_count_display', 'sold_seats_count_display'
    )
    list_filter = ('category', 'is_cancelled', 'start_date', 'venue')
    search_fields = ('title', 'description', 'location', 'city_name', 'venue__name')
    date_hierarchy = 'start_date'
    ordering = ('-start_date',)

    inlines = [PricingTierInline]

    raw_id_fields = ('organizer', 'venue',)

    readonly_fields = (
        'created_at', 'updated_at', 'organizer', 'city_name',
        'total_seats_display', 'available_seats_count_display', 'sold_seats_count_display'
    )

    # נגדיר את organizer כ-readonly אם המשתמש הנוכחי אינו סופר-יוזר
    def get_readonly_fields(self, request, obj=None):
        if obj and not request.user.is_superuser: # רק סופר-יוזר יכול לשנות מארגן
            return self.readonly_fields + ('organizer',)
        return self.readonly_fields

    # Custom methods for displaying properties in list_display and readonly_fields
    # These methods refer to the @property methods in the Event model
    def total_seats_display(self, obj):
        Seat = apps.get_model('seats', 'Seat') # <--- טעינה בטוחה של מודל Seat
        return obj.seats.count() # 'seats' הוא ה-related_name ממודל Seat

    total_seats_display.short_description = "סה''כ כיסאות"

    def available_seats_count_display(self, obj):
        Seat = apps.get_model('seats', 'Seat') # <--- טעינה בטוחה של מודל Seat
        return obj.seats.filter(status=Seat.AVAILABLE).count()

    available_seats_count_display.short_description = "כיסאות זמינים"

    def sold_seats_count_display(self, obj):
        Seat = apps.get_model('seats', 'Seat') # <--- טעינה בטוחה של מודל Seat
        return obj.seats.filter(status=Seat.SOLD).count()

    sold_seats_count_display.short_description = "כיסאות שנמכרו"

    fieldsets = (
        (None, {
            'fields': ('organizer', 'title', 'description', 'image', 'category', 'price', 'is_cancelled')
        }),
        ('פרטי תאריך ומיקום', {
            'fields': ('start_date', 'end_date', 'venue', 'location', 'city_name')
        }),
        ('מידע על כיסאות', {
            'fields': ('total_seats_display', 'available_seats_count_display', 'sold_seats_count_display'),
            'description': 'נתונים אלו מחושבים אוטומטית ממפת הישיבה וסטטוס הכיסאות. הם אינם ניתנים לעריכה ישירה.',
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.organizer = request.user
        super().save_model(request, obj, form, change)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('venue__seating_map')


# אין צורך לרשום את EventAdmin ו-PricingTierAdmin שוב, זה כבר נעשה ע"י @admin.register
# admin.site.register(Event, EventAdmin) # שורה זו מיותרת כשיש @admin.register



