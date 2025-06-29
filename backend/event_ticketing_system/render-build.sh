#!/bin/bash

echo "📦 Installing dependencies..."
pip install -r ../requirements.txt

echo "🧹 Collecting static files..."
python manage.py collectstatic --noinput

echo "🗄️ Running migrations..."
python manage.py migrate

echo "✅ Build completed successfully!"
