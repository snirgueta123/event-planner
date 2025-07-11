# Generated by Django 5.2.3 on 2025-06-17 18:46

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('events', '0001_initial'),
        ('venues', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Seat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('section', models.CharField(max_length=100)),
                ('row_number', models.CharField(max_length=10)),
                ('seat_number', models.CharField(max_length=10)),
                ('status', models.CharField(choices=[('available', 'Available'), ('reserved', 'reserved'), ('sold', 'Sold')], default='available', max_length=20)),
                ('reservation_expiry', models.DateTimeField(blank=True, null=True)),
                ('event', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='seats', to='events.event')),
                ('reserved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reserved_seats', to=settings.AUTH_USER_MODEL)),
                ('venue', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='seats', to='venues.venue')),
            ],
            options={
                'ordering': ['event', 'section', 'row_number', 'seat_number'],
                'unique_together': {('event', 'section', 'row_number', 'seat_number')},
            },
        ),
    ]
