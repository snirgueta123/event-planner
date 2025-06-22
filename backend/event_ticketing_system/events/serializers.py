# events/serializers.py
from rest_framework import serializers
from .models import Event, PricingTier
from users.serializers import UserSerializer
from venues.serializers import VenueSerializer  # <--- וודא שזה המיקום הנכון לייבוא VenueSerializer

# --- 1. PricingTierSerializer ---
class PricingTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingTier
        fields = ['id', 'name', 'price', 'start_date', 'end_date', 'quantity_threshold']
        read_only_fields = ['id']

    def validate(self, data):
        if data.get('price') is not None and data['price'] < 0:
            raise serializers.ValidationError({"price": "מחיר לא יכול להיות שלילי."})
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError({"end_date": "תאריך סיום חייב להיות אחרי תאריך התחלה."})
        if data.get('quantity_threshold') is not None and data['quantity_threshold'] < 0:
            raise serializers.ValidationError({"quantity_threshold": "כמות סף כרטיסים לא יכולה להיות שלילית."})
        return data


# --- 2. EventSerializer (לצורך קריאה, ליסט, פרטי אירוע) ---
class EventSerializer(serializers.ModelSerializer):
    organizer_username = serializers.CharField(source='organizer.username', read_only=True)
    pricing_tiers = PricingTierSerializer(many=True, read_only=True)
    venue_detail = VenueSerializer(source='venue', read_only=True)

    total_seats = serializers.ReadOnlyField()
    available_seats_count = serializers.ReadOnlyField()
    sold_seats_count = serializers.ReadOnlyField()

    available_tickets = serializers.SerializerMethodField()
    sales_progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'start_date', 'end_date', 'location',
            'city_name', 'category', 'price',
            'created_at', 'updated_at', 'organizer', 'organizer_username', 'image',
            'pricing_tiers', 'venue', 'venue_detail',
            'total_seats', 'available_seats_count', 'sold_seats_count',
            'available_tickets', 'sales_progress_percent'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'organizer', 'organizer_username', 'city_name']

    def get_available_tickets(self, obj):
        return obj.available_seats_count

    def get_sales_progress_percent(self, obj):
        total = obj.total_seats
        sold = obj.sold_seats_count
        if total > 0:
            return round((sold / total) * 100)
        return 0


# --- 3. EventCreateSerializer (ליצירת אירוע חדש) ---
class EventCreateSerializer(serializers.ModelSerializer):
    pricing_tiers = PricingTierSerializer(many=True, required=False)

    class Meta:
        model = Event
        fields = [
            'title', 'description', 'start_date', 'end_date', 'location', 'venue',
            'category', 'price', 'image', 'pricing_tiers'
        ]
        read_only_fields = []

    def create(self, validated_data):
        pricing_tiers_data = validated_data.pop('pricing_tiers', [])

        if 'request' in self.context and self.context['request'].user.is_authenticated:
            validated_data['organizer'] = self.context['request'].user
        else:
            raise serializers.ValidationError("An authenticated user is required to create an event.")

        event = Event.objects.create(**validated_data)

        for tier_data in pricing_tiers_data:
            tier_data.pop('id', None)
            PricingTier.objects.create(event=event, **tier_data)

        return event


# --- 4. EventUpdateSerializer (לעדכון אירוע קיים) ---
class EventUpdateSerializer(serializers.ModelSerializer):
    pricing_tiers = PricingTierSerializer(many=True, required=False)

    class Meta:
        model = Event
        fields = [
            'title', 'description', 'start_date', 'end_date', 'location', 'venue',
            'category', 'price', 'image', 'pricing_tiers'
        ]
        read_only_fields = ['organizer', 'created_at', 'updated_at', 'id']

    def update(self, instance, validated_data):
        pricing_tiers_data = validated_data.pop('pricing_tiers', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if pricing_tiers_data is not None:
            instance.pricing_tiers.all().delete()
            for tier_data in pricing_tiers_data:
                tier_data.pop('id', None)
                PricingTier.objects.create(event=instance, **tier_data)

        return instance
