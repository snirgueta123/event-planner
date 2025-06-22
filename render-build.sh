#!/bin/bash

# הפעלת וירטואל אנווירונמנט אם צריך (רק אם יש לך כזה)
# source venv/bin/activate

# התקנת תלויות
pip install -r backend/event_ticketing_system/requirements.txt

# איסוף קבצי סטטיק
python backend/event_ticketing_system/manage.py collectstatic --noinput

# הרצת מיגרציות
python backend/event_ticketing_system/manage.py migrate