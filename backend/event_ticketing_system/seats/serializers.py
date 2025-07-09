# seats/serializers.py
from rest_framework import serializers
from .models import Seat
from events.models import Event # ייבוא מידע בסיסי על האירוע בתוך הכיסא
from django.contrib.auth import get_user_model # נשאיר את הייבוא אבל נשתמש בו בתוך פונקציה אם צריך
from django.apps import apps # <--- חדש: ייבוא apps כדי להשיג מודל משתמש בבטחה

class EventSerializerForSeat(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ('id', 'title', 'start_date', 'end_date', 'city_name')
        read_only_fields = fields # רק לקריאה

class UserSerializerForSeat(serializers.ModelSerializer):
    class Meta:
        model = apps.get_model('users', 'User') # <--- שינוי: טעינה בטוחה של מודל המשתמש
        fields = ('id', 'username', 'email')
        read_only_fields = fields # רק לקריאה


class SeatSerializer(serializers.ModelSerializer):
    event = EventSerializerForSeat(read_only=True)
    reserved_by = UserSerializerForSeat(read_only=True)

    is_reserved_active = serializers.SerializerMethodField()

    class Meta:
        model = Seat
        fields = (
            'id', 'event', 'venue', 'section', 'row_number', 'seat_number',
            'status', 'reserved_by', 'reservation_expiry', 'ticket', 'is_reserved_active'
        )
        read_only_fields = (
            'event', 'venue', 'status', 'reserved_by', 'reservation_expiry', 'ticket', 'is_reserved_active'
        )

    def get_is_reserved_active(self, obj):
        return obj.is_reserved()





