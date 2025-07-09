# backend/venues/views.py
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Venue, SeatingMap
from .serializers import VenueSerializer, SeatingMapSerializer


class VenueListCreateView(generics.ListCreateAPIView):
    queryset = Venue.objects.all()
    serializer_class = VenueSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class VenueDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Venue.objects.all()
    serializer_class = VenueSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class SeatingMapListCreateView(generics.ListCreateAPIView):
    queryset = SeatingMap.objects.all()
    serializer_class = SeatingMapSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class SeatingMapDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SeatingMap.objects.all()
    serializer_class = SeatingMapSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class SeatingMapByVenueView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        venue_id = request.query_params.get('venue_id')
        if not venue_id:
            return Response({"error": "יש לספק venue_id."}, status=400)

        seating_map = get_object_or_404(SeatingMap, venue__id=venue_id)
        serializer = SeatingMapSerializer(seating_map)
        return Response(serializer.data)
