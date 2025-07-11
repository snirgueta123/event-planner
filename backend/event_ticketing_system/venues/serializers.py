# venues/serializers.py
from rest_framework import serializers
from .models import Venue, SeatingMap # ייבוא המודלים מאותה אפליקציה

class VenueSerializer(serializers.ModelSerializer):

    class Meta:
        model = Venue
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class SeatingMapSerializer(serializers.ModelSerializer):

    venue_name = serializers.CharField(source='venue.name', read_only=True)

    class Meta:
        model = SeatingMap
        fields = ['venue', 'venue_name', 'layout_data', 'created_at', 'updated_at']
        read_only_fields = ['venue', 'created_at', 'updated_at']

