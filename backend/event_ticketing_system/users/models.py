# users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    # הוסף כאן שדות מותאמים אישית אם יש לך כאלה (אם אין, השאר כפי שהיה)
    # לדוגמה:
    # phone_number = models.CharField(max_length=20, blank=True, null=True)
    # bio = models.TextField(blank=True, null=True)

    # הוספה קריטית: הגדרה מפורשת של שדות groups ו-user_permissions
    # עם related_name ייחודיים למניעת התנגשויות (כדי ש-DRF יעבוד).
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name=('groups'),
        blank=True,
        help_text=(
            'The groups this user belongs to. A user will get all permissions '
            'granted to each of their groups.'
        ),
        related_name="custom_user_groups", # שם ייחודי למניעת התנגשויות
        related_query_name="custom_user_group_query",
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name=('user permissions'),
        blank=True,
        help_text=('Specific permissions for this user.'),
        related_name="custom_user_permissions", # שם ייחודי למניעת התנגשויות
        related_query_name="custom_user_permission_query",
    )

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.username




