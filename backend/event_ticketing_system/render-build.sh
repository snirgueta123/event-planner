#!/bin/bash

echo "📦 Installing dependencies..."
pip install -r backend/requirements.txt

echo "⏳ Changing directory to backend/event_ticketing_system"
cd backend/event_ticketing_system || exit 1

echo "🧹 Collecting static files..."
python manage.py collectstatic --noinput

echo "🗄️ Running migrations..."
python manage.py migrate

echo "✅ Build completed successfully!"
