# events/permissions.py
from rest_framework import permissions


class IsOrganizerOrReadOnly(permissions.BasePermission):
    """
    הרשאה מותאמת אישית המאפשרת גישה רק לקריאה (GET, HEAD, OPTIONS) לכולם,
    אך מאפשרת כתיבה (POST, PUT, PATCH, DELETE) רק למארגן האירוע.
    מנהלי מערכת (is_staff) תמיד יוכלו לבצע את כל הפעולות.
    """

    def has_object_permission(self, request, view, obj):
        # הרשאות קריאה מותרות לכל בקשה (GET, HEAD, OPTIONS).
        if request.method in permissions.SAFE_METHODS:
            return True

        # הרשאות כתיבה מותרות רק למארגן האירוע.
        # אם המשתמש הוא staff (מנהל מערכת), הוא תמיד יוכל לערוך/למחוק.
        if request.user.is_staff:
            return True

        # אחרת, וודא שהמשתמש הוא המארגן של האירוע.
        # יש לוודא ששדה 'organizer' קיים במודל Event.
        return obj.organizer == request.user