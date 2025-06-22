# events/filters/event_filters.py
import django_filters
from events.models import Event  # וודא שאתה מייבא את מודל Event


class EventFilter(django_filters.rest_framework.FilterSet):
    organizer = django_filters.CharFilter(method='filter_by_organizer')

    class Meta:
        model = Event
        fields = ['category', 'location', 'organizer']  # הוסף organizer ל-fields

    def filter_by_organizer(self, queryset, name, value):
        if value == 'me' and self.request.user.is_authenticated:
            return queryset.filter(organizer=self.request.user)
        return queryset