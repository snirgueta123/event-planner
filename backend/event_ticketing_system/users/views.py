# users/views.py
from django.contrib.auth import get_user_model, authenticate
from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView # לשימוש ב-APIView כללי
from rest_framework.authtoken.models import Token # לייבוא טוקן אימות

# ייבוא הסריאליזרים שהוגדרו
from .serializers import (
    UserRegisterSerializer,
    UserLoginSerializer,
    UserSerializer, # עבור CurrentUserView ופרטי משתמש
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    SetNewPasswordSerializer
)

# ייבואים עבור פונקציונליות איפוס סיסמה
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_str, smart_bytes
from django.utils.http import urlsafe_base64_encode
from django.template.loader import render_to_string
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed

User = get_user_model()

# --- Views קיימים (מוגדרים כעת באופן ברור כ-APIView או generics) ---

class UserRegisterView(APIView):
    permission_classes = [permissions.AllowAny] # מאפשר רישום לכל אחד
    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            "user": UserSerializer(user, context={'request': request}).data,
            "token": token.key
        }, status=status.HTTP_201_CREATED)

class UserLoginView(APIView):
    permission_classes = [permissions.AllowAny] # מאפשר התחברות לכל אחד
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True) # וודא שוולידציה מתבצעת
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']

        user = authenticate(request, username=username, password=password)

        if user is not None:
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                "user": UserSerializer(user, context={'request': request}).data,
                "token": token.key
            }, status=status.HTTP_200_OK)
        return Response({"error": "שם משתמש או סיסמה שגויים."}, status=status.HTTP_400_BAD_REQUEST)

class CurrentUserView(generics.RetrieveAPIView):
    """
    קבלת פרטי המשתמש המחובר.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class ChangePasswordView(APIView): # הוגדר כ-APIView כדי להתאים לקוד שלך
    """
    View לשינוי סיסמת משתמש מחובר.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request): # שינוי ל-POST כפי שהיה בשימוש שלך
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # הסריאליזר כבר מטפל בוולידציה של סיסמה ישנה ותואמות חדשות, וכן בעדכון הסיסמה
            serializer.save()
            return Response({"message": "הסיסמה שונתה בהצלחה."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# --- חדש: Views עבור פונקציונליות "שכחתי סיסמה" (כקלאסים נפרדים) ---

class RequestPasswordResetView(APIView):
    """
    מטפל בבקשה לשליחת קישור לאיפוס סיסמה למייל.
    """
    permission_classes = [permissions.AllowAny] # נגיש גם ללא אימות
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # אם המשתמש לא קיים, נחזיר תגובה כללית למנוע זליגת מידע
            return Response({"message": "אם קיים חשבון המשויך לכתובת אימייל זו, יישלח אליו קישור לאיפוס סיסמה."},
                            status=status.HTTP_200_OK)

        uidb64 = urlsafe_base64_encode(smart_bytes(user.pk))
        token = PasswordResetTokenGenerator().make_token(user)

        # בניית הקישור לאיפוס סיסמה
        # ודא ש-settings.FRONTEND_URL מוגדר ב-settings.py שלך
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000') # ברירת מחדל
        reset_link = f"{frontend_url}/reset-password/{uidb64}/{token}/"

        email_subject = "איפוס סיסמה לחשבונך"
        email_body = render_to_string(
            'email/password_reset_email.html', # נצטרך ליצור קובץ זה בהמשך
            {
                'user': user,
                'reset_link': reset_link,
            }
        )

        try:
            send_mail(
                email_subject,
                "", # תוכן טקסט רגיל (אפשר להשאיר ריק אם משתמשים רק ב-html_message)
                settings.DEFAULT_FROM_EMAIL, # אימייל השולח מוגדר ב-settings.py
                [user.email],
                html_message=email_body, # תוכן HTML של האימייל
                fail_silently=False, # כדי לקבל שגיאות אם האימייל לא נשלח
            )
            return Response(
                {"message": "אם קיים חשבון המשויך לכתובת אימייל זו, יישלח אליו קישור לאיפוס סיסמה."},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            print(f"Error sending email: {e}")
            return Response({"message": "אירעה שגיאה בשליחת אימייל לאיפוס סיסמה. אנא נסה שוב מאוחר יותר."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SetNewPasswordView(APIView):
    """
    מטפל בהגדרת הסיסמה החדשה לאחר קבלת קישור איפוס.
    """
    permission_classes = [permissions.AllowAny] # נגיש גם ללא אימות
    def post(self, request): # שינוי ל-POST עבור הפשטות עם Frontend form
        serializer = SetNewPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # הסריאליזר כבר טיפל בוולידציה ועדכון הסיסמה באמצעות ה-save() שלו
        serializer.save()
        return Response({"message": "הסיסמה אופסה בהצלחה. כעת תוכל להתחבר עם הסיסמה החדשה."},
                        status=status.HTTP_200_OK)
