from django.contrib.auth import authenticate, login, logout
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .access import projects_for, tasks_for
from .models import Customer, Role, Task, User
from .permissions import IsManager
from .serializers import (CustomerSerializer, ProjectSerializer, TaskCreateSerializer,
                          TaskSerializer, UserSerializer)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []  # вход не требует CSRF/сессии

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


# (из статуса, в статус) -> кто может: "executor" или "manager"
TRANSITIONS = {
    (Task.Status.TODO, Task.Status.IN_PROGRESS): "executor",
    (Task.Status.IN_PROGRESS, Task.Status.REVIEW): "executor",
    (Task.Status.REVIEW, Task.Status.DONE): "manager",
    (Task.Status.REVIEW, Task.Status.IN_PROGRESS): "manager",
}
MANAGER_FIELDS = {"title", "description", "assignee", "due_date", "status"}
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
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class TaskDetail(generics.RetrieveUpdateAPIView):
    serializer_class = TaskSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return tasks_for(self.request.user)

    def partial_update(self, request, *args, **kwargs):
        task = self.get_object()  # чужая задача -> 404
        user = request.user
        allowed = MANAGER_FIELDS if user.role == Role.MANAGER else EMPLOYEE_FIELDS
        forbidden = set(request.data) - allowed
        if forbidden:
            raise PermissionDenied(f"Нельзя менять поля: {', '.join(sorted(forbidden))}.")

        new_status = request.data.get("status")
        if new_status and new_status != task.status:
            who = TRANSITIONS.get((task.status, new_status))
            if who is None:
                raise ValidationError({"status": "Недопустимый переход статуса."})
            if who == "executor" and task.assignee_id != user.id:
                raise PermissionDenied("Статус меняет только исполнитель.")
            if who == "manager" and user.role != Role.MANAGER:
                raise PermissionDenied("Принимать и возвращать результат может только руководитель.")

        if "assignee" in request.data and request.data["assignee"] is not None:
            assignee = User.objects.filter(pk=request.data["assignee"]).first()
            project = task.project
            if not assignee or (assignee != project.manager and not project.members.filter(pk=assignee.pk).exists()):
                raise ValidationError({"assignee": "Исполнитель должен быть участником проекта."})

        serializer = TaskSerializer(task, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(**({"status": new_status} if new_status else {}))
        return Response(serializer.data)
