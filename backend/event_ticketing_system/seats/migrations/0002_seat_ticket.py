# Generated by Django 5.2.3 on 2025-06-17 19:09

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('seats', '0001_initial'),
        ('tickets', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='seat',
            name='ticket',
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='seat_assignment', to='tickets.ticket'),
        ),
    ]
