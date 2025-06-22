#!/bin/bash

# נכנסים לתיקיית backend כי שם נמצא Django project
cd backend

# מתקינים את התלויות
pip install -r requirements.txt

# מבצעים את ה-collectstatic בלי קלט משתמש
python manage.py collectstatic --noinput

# מריצים מיגרציות בסיס הנתונים
python manage.py migrate
