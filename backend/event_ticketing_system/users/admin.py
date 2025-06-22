from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User  # מודל המשתמש המותאם אישית שלך

admin.site.register(User, UserAdmin)