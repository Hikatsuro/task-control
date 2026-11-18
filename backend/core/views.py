from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.db.models import Prefetch, Q
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from rest_framework import generics, serializers, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .access import projects_for, tasks_for
from .models import Customer, Department, Notification, Role, Task, TaskAttachment, TaskEvent, User, WorkspaceSettings
from .permissions import IsManager
from .serializers import (CustomerSerializer, ProjectSerializer, TaskCreateSerializer,
                          TaskSerializer, UserSerializer)
from api_client import format_project_tasks
from .workspace import make_reminders, notify_task


def task_metadata(queryset):
    return queryset.prefetch_related("events", "comments", Prefetch("attachments", queryset=TaskAttachment.objects.defer("data")))


class CsrfTokenView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        response = Response({"csrf_token": get_token(request)})
        response["Cache-Control"] = "no-store"
        return response


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        user = authenticate(request, username=request.data.get("username"),
                            password=request.data.get("password"))
        if user is None:
            return Response({"detail": "Неверный логин или пароль."}, status=status.HTTP_401_UNAUTHORIZED)
        login(request, user)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class WorkspaceView(APIView):
    def get(self, request):
        projects = projects_for(request.user).prefetch_related("members").order_by("-created_at")
        users = User.objects.filter(
            Q(pk=request.user.pk) | Q(managed_projects__in=projects) | Q(member_projects__in=projects)
        ).distinct()
        if request.user.role == Role.ADMIN:
            users = User.objects.all()
        elif request.user.role == Role.MANAGER:
            users = User.objects.filter(Q(pk=request.user.pk) | Q(role=Role.EMPLOYEE, is_active=True) | Q(member_projects__in=projects)).distinct()
        customers = Customer.objects.all() if request.user.role == Role.MANAGER else Customer.objects.filter(projects__in=projects).distinct()
        tasks = task_metadata(tasks_for(request.user).filter(project__in=projects).select_related("project")).order_by("-created_at")
        make_reminders(request.user, tasks)
        notifications = Notification.objects.filter(user=request.user).filter(Q(task__isnull=True) | Q(task__in=tasks)).order_by("-created_at")
        settings = WorkspaceSettings.objects.filter(pk=1).values("name", "description").first()
        return Response({
            "user": UserSerializer(request.user).data,
            "users": UserSerializer(users, many=True).data,
            "customers": CustomerSerializer(customers, many=True).data,
            "projects": ProjectSerializer(projects, many=True).data,
            "tasks": TaskSerializer(tasks, many=True).data,
            "departments": list(Department.objects.order_by("name").values("id", "name", "description")),
            "notifications": list(notifications.values("id", "task_id", "title", "body", "read", "created_at")),
            "settings": settings or {"name": "TaskControl", "description": ""},
            "preferences": request.user.preferences,
        })


class CustomerListCreate(generics.ListCreateAPIView):
    """Заказчиков ведёт только руководитель (справочник общий для руководителей)."""
    serializer_class = CustomerSerializer
    permission_classes = [IsManager]
    queryset = Customer.objects.all().order_by("name")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ProjectListCreate(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer

    def get_permissions(self):
        return [IsManager()] if self.request.method == "POST" else super().get_permissions()

    def get_queryset(self):
        return projects_for(self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        project = serializer.save(manager=self.request.user)
        return project


class ProjectDetail(generics.RetrieveAPIView):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return projects_for(self.request.user)


class ProjectMembers(ProjectDetail):
    permission_classes = [IsManager]

    def retrieve(self, request, *args, **kwargs):
        project = self.get_object()
        members = project.members.filter(is_active=True).order_by("username")
        return Response(UserSerializer(members, many=True).data)


class ProjectTaskContext(ProjectDetail):
    def retrieve(self, request, *args, **kwargs):
        project = self.get_object()
        tasks = tasks_for(request.user).filter(project=project).order_by("id")
        return Response(format_project_tasks(TaskSerializer(tasks, many=True).data))


# (из статуса, в статус) -> кто может: "executor" или "manager"
TRANSITIONS = {
    (Task.Status.TODO, Task.Status.IN_PROGRESS): "executor",
    (Task.Status.IN_PROGRESS, Task.Status.REVIEW): "executor",
    (Task.Status.REVIEW, Task.Status.DONE): "manager",
    (Task.Status.REVIEW, Task.Status.IN_PROGRESS): "manager",
}
MANAGER_FIELDS = {"title", "description", "assignee", "due_date", "status", "priority", "return_reason"}
EMPLOYEE_FIELDS = {"status"}


class TaskListCreate(generics.ListCreateAPIView):
    def get_permissions(self):
        return [IsManager()] if self.request.method == "POST" else super().get_permissions()

    def get_serializer_class(self):
        return TaskCreateSerializer if self.request.method == "POST" else TaskSerializer

    def get_queryset(self):
        qs = tasks_for(self.request.user).order_by("-created_at")
        project_id = self.request.query_params.get("project_id")
        if project_id is not None:
            if not project_id.isdigit():
                raise ValidationError({"project_id": "Ожидается число."})
            qs = qs.filter(project_id=int(project_id))
        return task_metadata(qs)

    @transaction.atomic
    def perform_create(self, serializer):
        task = serializer.save(created_by=self.request.user)
        TaskEvent.objects.create(task=task, author=self.request.user, text="Задача создана и назначен исполнитель")
        if task.assignee_id != self.request.user.pk:
            notify_task(task, task.assignee_id, "assignment", "Вам назначена задача")


class TaskDetail(generics.RetrieveUpdateAPIView):
    serializer_class = TaskSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        tasks = tasks_for(self.request.user)
        return tasks.select_for_update() if self.request.method == "PATCH" else tasks

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        task = self.get_object()  # чужая задача -> 404
        user = request.user
        if task.project.is_archived or task.project.is_completed:
            raise ValidationError({"project": "Проект завершён или находится в архиве."})
        allowed = MANAGER_FIELDS if user.role == Role.MANAGER else EMPLOYEE_FIELDS
        forbidden = set(request.data) - allowed
        if forbidden:
            raise PermissionDenied(f"Нельзя менять поля: {', '.join(sorted(forbidden))}.")

        serializer = TaskSerializer(task, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        new_status = None
        if "status" in request.data:
            try:
                new_status = serializers.ChoiceField(choices=Task.Status.choices).run_validation(request.data["status"])
            except ValidationError as error:
                raise ValidationError({"status": error.detail}) from error
        if new_status and new_status != task.status:
            who = TRANSITIONS.get((task.status, new_status))
            if who is None:
                raise ValidationError({"status": "Недопустимый переход статуса."})
            if who == "executor" and task.assignee_id != user.id:
                raise PermissionDenied("Статус меняет только исполнитель.")
            if who == "manager" and user.role != Role.MANAGER:
                raise PermissionDenied("Принимать и возвращать результат может только руководитель.")

        is_return = task.status == Task.Status.REVIEW and new_status == Task.Status.IN_PROGRESS
        reason = ""
        if is_return:
            reason = serializers.CharField(min_length=3, max_length=2000).run_validation(request.data.get("return_reason"))
        elif "return_reason" in request.data:
            raise ValidationError({"return_reason": "Причина нужна при возврате на доработку."})

        assignee = serializer.validated_data.get("assignee")
        if assignee is not None:
            project = task.project
            if assignee != project.manager and not project.members.filter(pk=assignee.pk).exists():
                raise ValidationError({"assignee": "Исполнитель должен быть участником проекта."})

        if new_status and new_status != task.status:
            change = f"{task.get_status_display()} → {Task.Status(new_status).label}"
            serializer.save(status=new_status, completed_at=timezone.now() if new_status == Task.Status.DONE else None)
            TaskEvent.objects.create(task=task, author=user, text=f"{change}. {reason}" if reason else change)
            recipient = task.project.manager_id if new_status == Task.Status.REVIEW else task.assignee_id
            titles = {Task.Status.REVIEW: "Задача ожидает проверки", Task.Status.DONE: "Работа принята"}
            if recipient != user.pk:
                notify_task(task, recipient, "review", titles.get(new_status, "Задача возвращена на доработку"))
        else:
            old_assignee = task.assignee_id
            serializer.save()
            if serializer.validated_data:
                TaskEvent.objects.create(task=task, author=user, text="Обновлены сведения о задаче")
                if task.assignee_id != user.pk:
                    changed = task.assignee_id != old_assignee
                    notify_task(task, task.assignee_id, "assignment" if changed else "changes",
                                "Вам назначена задача" if changed else "Сведения о задаче обновлены")
        return Response(TaskSerializer(task).data)
