from rest_framework import serializers

from .access import projects_for
from .models import Customer, Project, Role, Task, TaskAttachment, TaskComment, TaskEvent, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "role", "email", "is_active", "department", "position"]


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["id", "name", "contact", "email", "phone", "notes", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProjectSerializer(serializers.ModelSerializer):
    members = serializers.PrimaryKeyRelatedField(
        many=True, required=False, queryset=User.objects.filter(role=Role.EMPLOYEE, is_active=True))

    class Meta:
        model = Project
        fields = ["id", "name", "description", "customer", "manager", "members", "is_archived", "is_completed", "start_date", "due_date", "created_at"]
        read_only_fields = ["id", "manager", "created_at"]

    def validate(self, attrs):
        project = self.instance
        start = attrs.get("start_date", getattr(project, "start_date", None))
        due = attrs.get("due_date", getattr(project, "due_date", None))
        if start and due and start > due:
            raise serializers.ValidationError({"due_date": "Дата окончания раньше даты начала."})
        if project:
            tasks = project.tasks.all()
            if (attrs.get("is_completed", project.is_completed) or attrs.get("is_archived", project.is_archived)) and tasks.exclude(status=Task.Status.DONE).exists():
                raise serializers.ValidationError({"status": "Сначала примите все задачи проекта."})
            if "members" in attrs and tasks.exclude(status=Task.Status.DONE).exclude(assignee_id__in=[project.manager_id, *[u.pk for u in attrs["members"]]]).exclude(assignee=None).exists():
                raise serializers.ValidationError({"members": "Сначала переназначьте незавершённые задачи участника."})
            if (start and tasks.filter(due_date__lt=start).exists()) or (due and tasks.filter(due_date__gt=due).exists()):
                raise serializers.ValidationError({"due_date": "В период проекта должны попадать сроки всех задач."})
        return attrs


class TaskEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskEvent
        fields = ["id", "author", "text", "created_at"]


class TaskCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskComment
        fields = ["id", "author", "text", "created_at"]


class TaskAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskAttachment
        fields = ["id", "author", "name", "size", "content_type", "created_at"]


class TaskSerializer(serializers.ModelSerializer):
    events = TaskEventSerializer(many=True, read_only=True)
    comments = TaskCommentSerializer(many=True, read_only=True)
    attachments = TaskAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = ["id", "project", "title", "description", "assignee", "status",
                  "due_date", "priority", "completed_at", "created_by", "created_at", "updated_at", "events", "comments", "attachments"]
        read_only_fields = ["id", "created_by", "created_at", "updated_at", "completed_at", "status"]

    def validate(self, attrs):
        project = self.instance.project if self.instance else attrs.get("project")
        deadline = attrs.get("due_date")
        if project and deadline and ((project.start_date and deadline < project.start_date) or (project.due_date and deadline > project.due_date)):
            raise serializers.ValidationError({"due_date": "Срок задачи должен попадать в период проекта."})
        return attrs


class TaskCreateSerializer(TaskSerializer):
    """Создание: только руководитель, только в своём проекте, исполнитель — из команды проекта."""

    def validate(self, attrs):
        user = self.context["request"].user
        project = attrs["project"]
        if not projects_for(user).filter(pk=project.pk).exists():
            raise serializers.ValidationError({"project": "Проект недоступен."})
        if project.is_archived or project.is_completed:
            raise serializers.ValidationError({"project": "Проект завершён или находится в архиве."})
        assignee = attrs.get("assignee")
        if assignee and assignee != project.manager and not project.members.filter(pk=assignee.pk).exists():
            raise serializers.ValidationError({"assignee": "Исполнитель должен быть участником проекта."})
        return super().validate(attrs)
