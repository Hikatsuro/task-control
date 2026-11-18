from datetime import timedelta
from io import BytesIO
from pathlib import PurePosixPath

from django.contrib.auth import password_validation, update_session_auth_hash
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .access import projects_for, tasks_for
from .models import Customer, Department, Notification, Project, Role, Task, TaskAttachment, TaskComment, User, WorkspaceSettings
from .serializers import CustomerSerializer, ProjectSerializer


def check_role(user, role):
    if user.role != role:
        raise PermissionDenied("Действие недоступно для вашей роли.")


def bind(serializer, payload, instance=None, *, partial=False):
    form = serializer(instance=instance, data=payload, partial=partial)
    form.is_valid(raise_exception=True)
    return form


def task_for(user, task_id):
    return get_object_or_404(tasks_for(user), pk=task_id)


def notify_task(task, user_id, category, title):
    if user_id is None:
        return
    user = User.objects.filter(pk=user_id, is_active=True).only("preferences").first()
    if user and user.preferences.get(category, True):
        Notification.objects.create(user_id=user_id, task=task, title=title, body=task.title)


def make_reminders(user, tasks):
    if not user.preferences.get("deadline", True):
        return
    today = timezone.localdate()
    tomorrow = today + timedelta(days=1)
    for task in tasks:
        if task.status == Task.Status.DONE or task.project.is_archived or task.project.is_completed or not task.due_date or task.due_date > tomorrow:
            continue
        period = "overdue" if task.due_date < today else "today" if task.due_date == today else "tomorrow"
        title = {"overdue": "Срок задачи истёк", "today": "Задача со сроком на сегодня", "tomorrow": "Срок задачи завтра"}[period]
        Notification.objects.get_or_create(reminder_key=f"{user.pk}:{task.pk}:{task.due_date}:{period}", defaults={
            "user": user, "task": task, "title": title, "body": task.title,
        })


class UserInput(serializers.ModelSerializer):
    name = serializers.CharField(max_length=80, min_length=2, source="first_name")
    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)

    class Meta:
        model = User
        fields = ["username", "name", "email", "role", "is_active", "department", "position", "password"]

    def validate_username(self, value):
        existing = User.objects.filter(username__iexact=value)
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise ValidationError("Этот логин уже занят.")
        return value


class DepartmentInput(serializers.ModelSerializer):
    members = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), many=True, write_only=True)

    class Meta:
        model = Department
        fields = ["name", "description", "members"]


class ProfileInput(serializers.ModelSerializer):
    name = serializers.CharField(max_length=80, min_length=2, source="first_name")

    class Meta:
        model = User
        fields = ["name", "email", "position"]


class SettingsInput(serializers.ModelSerializer):
    class Meta:
        model = WorkspaceSettings
        fields = ["name", "description"]


class CommandEnvelope(serializers.Serializer):
    action = serializers.CharField(max_length=40)
    id = serializers.IntegerField(min_value=1, required=False)
    task = serializers.IntegerField(min_value=1, required=False)
    data = serializers.DictField(required=False, default=dict)


class WorkspaceCommands(APIView):
    @transaction.atomic
    def post(self, request):
        command = bind(CommandEnvelope, request.data).validated_data
        actor = request.user
        action = command["action"]
        key = command.get("id")
        data = command["data"]
        if action == "project":
            check_role(actor, Role.MANAGER)
            project = get_object_or_404(projects_for(actor).select_for_update(), pk=key) if key else None
            form = bind(ProjectSerializer, data, project, partial=bool(project))
            form.save(manager=actor)
        elif action == "customer":
            check_role(actor, Role.MANAGER)
            customer = get_object_or_404(Customer, pk=key) if key else None
            form = bind(CustomerSerializer, data, customer, partial=bool(customer))
            form.save() if customer else form.save(created_by=actor)
        elif action == "user":
            check_role(actor, Role.ADMIN)
            self.save_user(actor, key, data)
        elif action == "department":
            check_role(actor, Role.ADMIN)
            department = get_object_or_404(Department, pk=key) if key else None
            values = bind(DepartmentInput, data, department).validated_data
            members = values.pop("members")
            if department:
                department.name, department.description = values["name"], values.get("description", "")
                department.save(update_fields=["name", "description"])
            else:
                department = Department.objects.create(**values)
            ids = [member.pk for member in members]
            User.objects.filter(department=department).exclude(pk__in=ids).update(department=None)
            User.objects.filter(pk__in=ids).update(department=department)
        elif action == "profile":
            bind(ProfileInput, data, actor).save()
        elif action == "password":
            self.change_password(request, data)
        elif action == "settings":
            check_role(actor, Role.ADMIN)
            settings, _ = WorkspaceSettings.objects.get_or_create(pk=1)
            bind(SettingsInput, data, settings).save()
        elif action == "preferences":
            allowed = {"assignment", "changes", "deadline", "comments", "review", "reducedMotion"}
            if any(name not in allowed or type(value) is not bool for name, value in data.items()):
                raise ValidationError("Неизвестная настройка уведомлений.")
            user = User.objects.select_for_update().get(pk=actor.pk)
            user.preferences = {**user.preferences, **data}
            user.save(update_fields=["preferences"])
        elif action in {"notification", "notifications"}:
            if type(data.get("read")) is not bool:
                raise ValidationError({"read": "Укажите состояние уведомления."})
            own = Notification.objects.filter(user=actor)
            if action == "notification":
                item = get_object_or_404(own, pk=key)
                own = own.filter(pk=item.pk)
            own.update(read=data["read"])
        elif action in {"comment", "delete-comment"}:
            task = task_for(actor, command.get("task"))
            if action == "delete-comment":
                get_object_or_404(TaskComment, pk=key, task=task, author=actor).delete()
            else:
                text = serializers.CharField(min_length=1, max_length=5000).run_validation(data.get("text"))
                TaskComment.objects.create(task=task, author=actor, text=text)
                for user_id in {task.project.manager_id, task.assignee_id} - {actor.pk}:
                    notify_task(task, user_id, "comments", "Новый комментарий")
        else:
            raise ValidationError({"action": "Неизвестное действие."})
        return Response(status=204)

    @staticmethod
    def save_user(actor, key, data):
        user = get_object_or_404(User.objects.select_for_update(), pk=key) if key else None
        form = bind(UserInput, data, user, partial=bool(user))
        values = form.validated_data
        password = values.pop("password", None)
        if user == actor and (values.get("role", actor.role) != Role.ADMIN or not values.get("is_active", True)):
            raise ValidationError("Нельзя заблокировать себя или снять свою роль администратора.")
        if user and values.get("role", user.role) != Role.MANAGER and Project.objects.filter(manager=user, is_archived=False, is_completed=False).exists():
            raise ValidationError("Сначала завершите активные проекты руководителя.")
        if user and user.is_superuser and user != actor:
            raise PermissionDenied("Нельзя менять учётную запись суперпользователя через этот экран.")
        if not user and not password:
            raise ValidationError({"password": "Укажите начальный пароль."})
        if password:
            try:
                password_validation.validate_password(password, user=user or User(**values))
            except DjangoValidationError as error:
                raise ValidationError({"password": error.messages}) from error
        if user:
            for field, value in values.items():
                setattr(user, field, value)
        else:
            user = User(**values)
        if password:
            user.set_password(password)
        user.save()

    @staticmethod
    def change_password(request, data):
        user = request.user
        old = serializers.CharField(trim_whitespace=False).run_validation(data.get("current"))
        new = serializers.CharField(trim_whitespace=False).run_validation(data.get("password"))
        if not user.check_password(old):
            raise ValidationError({"current": "Текущий пароль указан неверно."})
        try:
            password_validation.validate_password(new, user=user)
        except DjangoValidationError as error:
            raise ValidationError({"password": error.messages}) from error
        user.set_password(new)
        user.save(update_fields=["password"])
        update_session_auth_hash(request, user)


class TaskFiles(APIView):
    parser_classes = [MultiPartParser]

    @transaction.atomic
    def post(self, request, task_id):
        task = get_object_or_404(tasks_for(request.user).select_for_update(), pk=task_id)
        upload = request.FILES.get("file")
        if not upload or not 0 < upload.size <= 10 * 1024 * 1024:
            raise ValidationError({"file": "Выберите файл размером до 10 МБ."})
        if task.attachments.count() >= 20:
            raise ValidationError({"file": "В задаче уже 20 файлов."})
        name = PurePosixPath(upload.name.replace("\\", "/")).name
        TaskAttachment.objects.create(task=task, author=request.user, name=name,
                                      size=upload.size, content_type=upload.content_type[:120], data=upload.read())
        return Response(status=201)


class TaskFile(APIView):
    def get(self, request, task_id, file_id):
        task = task_for(request.user, task_id)
        item = get_object_or_404(TaskAttachment, pk=file_id, task=task)
        return FileResponse(BytesIO(item.data), as_attachment=True, filename=item.name,
                            content_type="application/octet-stream", headers={"Cache-Control": "no-store"})

    def delete(self, request, task_id, file_id):
        task = task_for(request.user, task_id)
        get_object_or_404(TaskAttachment, pk=file_id, task=task, author=request.user).delete()
        return Response(status=204)
