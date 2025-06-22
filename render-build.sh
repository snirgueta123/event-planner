#!/usr/bin/env bash
python backend/event_ticketing_system/manage.py collectstatic --noinput
python backend/event_ticketing_system/manage.py migrate

