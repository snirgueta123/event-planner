# seats/admin.py
from django.contrib import admin
from .models import Seat  # ייבוא מודל Seat
from django.contrib.auth import get_user_model  # אם משתמשים במודל משתמש

User = get_user_model()

@admin.register(Seat)
class SeatAdmin(admin.ModelAdmin):
    list_display = (
    'event', 'venue', 'section', 'row_number', 'seat_number', 'status', 'reserved_by', 'reservation_expiry',
    'ticket_assigned_display')
    list_filter = ('event', 'venue', 'section', 'status')
    search_fields = ('event__title', 'venue__name', 'section', 'row_number', 'seat_number', 'reserved_by__username')

    raw_id_fields = ('event', 'venue', 'reserved_by',)

    readonly_fields = ('reservation_expiry', 'ticket_assigned_display')

    def ticket_assigned_display(self, obj):
        if obj.id and hasattr(obj, 'assigned_ticket') and obj.assigned_ticket:
            return f"כרטיס: {obj.assigned_ticket.ticket_code}"
        return "אין כרטיס"

    ticket_assigned_display.short_description = 'כרטיס משויך'


