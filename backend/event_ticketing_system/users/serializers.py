# users/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model # שינוי: קבל את מודל המשתמש בבטחה
from django.contrib.auth.password_validation import validate_password

# ייבואים חדשים עבור איפוס סיסמה
from django.utils.encoding import smart_str, force_bytes, DjangoUnicodeDecodeError
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from rest_framework.exceptions import AuthenticationFailed

# קבל את מודל המשתמש הפעיל (בטוח יותר לשימוש)
User = get_user_model()


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'password2', 'email', 'first_name', 'last_name')
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False},
            'email': {'required': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})

        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({"email": "Email already registered."})

        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user


class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)


# *** זהו ה-UserSerializer המתוקן שגורם לבעיה הנוכחית ***
class UserSerializer(serializers.ModelSerializer):
    # הוספה קריטית: הגדרה מפורשת של שדות groups ו-user_permissions
    # גם אם אתה לא משתמש בהם ישירות בפרונטאנד, DRF מנסה לגשת אליהם
    # ויכול להיכשל אם הם לא מוגדרים בצורה תואמת.
    # שימוש ב-PrimaryKeyRelatedField עם read_only=True הוא דרך בטוחה.
    groups = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    user_permissions = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = User
        # *** שינוי קריטי: הגדרה מפורשת של השדות שאנחנו רוצים לכלול ***
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'is_staff',
            # נוסיף את השדות groups ו-user_permissions לרשימה
            'groups',
            'user_permissions'
        ]
        read_only_fields = ['id', 'username', 'is_staff', 'groups', 'user_permissions'] # ונוסיף אותם ל-read_only


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password1 = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=True, write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("הסיסמה הישנה אינה נכונה.")
        return value

    def validate(self, data):
        if data['new_password1'] != data['new_password2']:
            raise serializers.ValidationError({"new_password2": "הסיסמאות החדשות אינן תואמות."})
        return data

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password1'])
        user.save()
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True, min_length=2)

    class Meta:
        fields = ['email']


class SetNewPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(min_length=6, write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(min_length=6, write_only=True, required=True)
    uidb64 = serializers.CharField(min_length=1, write_only=True, required=True)
    token = serializers.CharField(min_length=1, write_only=True, required=True)

    class Meta:
        fields = ['password', 'password2', 'uidb64', 'token']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})

        try:
            uid = smart_str(urlsafe_base64_decode(attrs['uidb64']))
            user = User.objects.get(id=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist, DjangoUnicodeDecodeError):
            raise serializers.ValidationError({"uidb64": "קישור לאיפוס סיסמה אינו חוקי או פג תוקף."})

        if not PasswordResetTokenGenerator().check_token(user, attrs['token']):
            raise AuthenticationFailed("הקישור לאיפוס סיסמה אינו חוקי או פג תוקף.", 401)

        self.user = user
        return attrs

    def save(self, **kwargs):
        self.user.set_password(self.validated_data['password'])
        self.user.save()
        return self.user
