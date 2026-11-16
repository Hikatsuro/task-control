from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Customer, Project, Task, User

admin.site.register(User, UserAdmin.__class__("RoleUserAdmin", (UserAdmin,), {
    "fieldsets": UserAdmin.fieldsets + (("Роль", {"fields": ("role",)}),),
    "add_fieldsets": UserAdmin.add_fieldsets + (("Роль", {"fields": ("role",)}),),
    "list_display": ("username", "role", "is_active"),
}))
admin.site.register([Customer, Project, Task])
