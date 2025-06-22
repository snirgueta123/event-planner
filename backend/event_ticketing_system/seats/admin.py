# seats/admin.py
from django.contrib import admin
from .models import Seat  # ייבוא מודל Seat
from django.contrib.auth import get_user_model  # אם משתמשים במודל משתמש

# ייתכן שיש לך כאן אינליינים או דברים אחרים, אני אתמקד בתיקון השגיאה הספציפית

User = get_user_model()  # לטעון את מודל המשתמש בבטחה


@admin.register(Seat)
class SeatAdmin(admin.ModelAdmin):
    list_display = (
    'event', 'venue', 'section', 'row_number', 'seat_number', 'status', 'reserved_by', 'reservation_expiry',
    'ticket_assigned_display')
    list_filter = ('event', 'venue', 'section', 'status')
    search_fields = ('event__title', 'venue__name', 'section', 'row_number', 'seat_number', 'reserved_by__username')

    # *** שינוי קריטי כאן: הסרת 'ticket' מ-raw_id_fields ***
    # נשאיר רק את השדות הקיימים כרגע במודל Seat (לפני הוספת שדה ticket חזרה)
    raw_id_fields = ('event', 'venue', 'reserved_by',)  # <--- ודא ש-'ticket' אינו כאן!

    readonly_fields = ('reservation_expiry', 'ticket_assigned_display')  # ייתכן שתרצה להציג מידע על הכרטיס המשויך

    # שיטה להצגת פרטי הכרטיס אם הוא משויך (לפני הוספת השדה חזרה למודל)
    def ticket_assigned_display(self, obj):
        if obj.id and hasattr(obj, 'assigned_ticket') and obj.assigned_ticket:  # ודא שיש אובייקט קיים ושדה קיים
            return f"כרטיס: {obj.assigned_ticket.ticket_code}"
        return "אין כרטיס"

    ticket_assigned_display.short_description = 'כרטיס משויך'

# אם היו לך פונקציות או הגדרות אחרות, וודא שהן נשארות.
# admin.site.register(Seat, SeatAdmin) # אין צורך בשורה זו אם משתמשים ב-@admin.register

