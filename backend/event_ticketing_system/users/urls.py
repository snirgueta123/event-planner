# users/urls.py
from django.urls import path
# וודא שכל ה-Views מיובאים כאן
from .views import (
    UserRegisterView,
    UserLoginView,
    CurrentUserView,
    ChangePasswordView,
    RequestPasswordResetView, # <-- חדש: ייבוא של ה-View החדש
    SetNewPasswordView        # <-- חדש: ייבוא של ה-View החדש
)

urlpatterns = [
    path('register/', UserRegisterView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    # --- נתיבים חדשים לאיפוס סיסמה ---
    path('request-password-reset/', RequestPasswordResetView.as_view(), name='request-password-reset'), # נתיב לבקשת איפוס
    path('set-new-password/', SetNewPasswordView.as_view(), name='set-new-password'), # נתיב להגדרת סיסמה חדשה
]
