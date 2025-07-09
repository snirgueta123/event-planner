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

class UserRegisterView(APIView):
    permission_classes = [permissions.AllowAny]
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
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
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
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "הסיסמה שונתה בהצלחה."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class RequestPasswordResetView(APIView):
    permission_classes = [permissions.AllowAny] # נגיש גם ללא אימות
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"message": "אם קיים חשבון המשויך לכתובת אימייל זו, יישלח אליו קישור לאיפוס סיסמה."},
                            status=status.HTTP_200_OK)

        uidb64 = urlsafe_base64_encode(smart_bytes(user.pk))
        token = PasswordResetTokenGenerator().make_token(user)

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        reset_link = f"{frontend_url}/reset-password/{uidb64}/{token}/"

        email_subject = "איפוס סיסמה לחשבונך"
        email_body = render_to_string(
            'email/password_reset_email.html',
            {
                'user': user,
                'reset_link': reset_link,
            }
        )

        try:
            send_mail(
                email_subject,
                "",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                html_message=email_body,
                fail_silently=False,
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

    permission_classes = [permissions.AllowAny]
    def post(self, request):
        serializer = SetNewPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "הסיסמה אופסה בהצלחה. כעת תוכל להתחבר עם הסיסמה החדשה."},
                        status=status.HTTP_200_OK)
