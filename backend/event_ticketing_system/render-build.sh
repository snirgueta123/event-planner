#!/bin/bash

echo "📦 Installing dependencies..."
pip install -r backend/event_ticketing_system/requirements.txt

echo "🧹 Collecting static files..."
python backend/event_ticketing_system/manage.py collectstatic --noinput

echo "🗄️ Running migrations..."
python backend/event_ticketing_system/manage.py migrate

echo "✅ Build completed successfully!"
