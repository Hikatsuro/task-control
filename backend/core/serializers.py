from rest_framework import serializers

from .access import projects_for
from .models import Customer, Project, Role, Task, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "role"]


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["id", "name", "contact", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProjectSerializer(serializers.ModelSerializer):
    members = serializers.PrimaryKeyRelatedField(
        many=True, required=False, queryset=User.objects.filter(role=Role.EMPLOYEE, is_active=True))

    class Meta:
        model = Project
        fields = ["id", "name", "description", "customer", "manager", "members", "is_archived", "created_at"]
        read_only_fields = ["id", "manager", "is_archived", "created_at"]


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ["id", "project", "title", "description", "assignee", "status",
                  "due_date", "created_by", "created_at", "updated_at"]
        read_only_fields = ["id", "created_by", "created_at", "updated_at", "status"]


class TaskCreateSerializer(TaskSerializer):
    """Создание: только руководитель, только в своём проекте, исполнитель — из команды проекта."""

    def validate(self, attrs):
        user = self.context["request"].user
        project = attrs["project"]
        if not projects_for(user).filter(pk=project.pk).exists():
            raise serializers.ValidationError({"project": "Проект недоступен."})
        assignee = attrs.get("assignee")
        if assignee and assignee != project.manager and not project.members.filter(pk=assignee.pk).exists():
            raise serializers.ValidationError({"assignee": "Исполнитель должен быть участником проекта."})
        return attrs
