# events/urls.py
from rest_framework.routers import DefaultRouter
from .views import EventViewSet

# צור מופע של DefaultRouter
router = DefaultRouter()

# רשום את EventViewSet עם הנתיב 'events'
# זה יצור באופן אוטומטי נתיבים עבור CRUD (list, create, retrieve, update, delete)
# וגם עבור פעולות מותאמות אישית כמו 'my_events' שהוגדרה ב-EventViewSet
router.register(r'events', EventViewSet)

# הגדר את urlpatterns של האפליקציה באמצעות הראוטר
urlpatterns = router.urls
