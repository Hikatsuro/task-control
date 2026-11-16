from rest_framework.permissions import BasePermission

from .models import Role


class IsManager(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.role == Role.MANAGER)
