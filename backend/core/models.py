from django.contrib.auth.models import AbstractUser, UserManager as DjangoUserManager
from django.db import models


class Role(models.TextChoices):
    ADMIN = "admin", "Администратор"
    MANAGER = "manager", "Руководитель"
    EMPLOYEE = "employee", "Сотрудник"


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)


class UserManager(DjangoUserManager):
    def create_superuser(self, username, email=None, password=None, **extra):
        extra.setdefault("role", Role.ADMIN)
        return super().create_superuser(username, email, password, **extra)


class User(AbstractUser):
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.EMPLOYEE)
    department = models.ForeignKey(Department, null=True, blank=True, on_delete=models.SET_NULL)
    position = models.CharField(max_length=120, blank=True)
    preferences = models.JSONField(default=dict, blank=True)
    objects = UserManager()


class Customer(models.Model):
    """Заказчик — запись в справочнике, без отдельного входа."""
    name = models.CharField(max_length=255)
    contact = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=40, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="customers")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Project(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="projects")
    manager = models.ForeignKey(User, on_delete=models.PROTECT, related_name="managed_projects")
    members = models.ManyToManyField(User, related_name="member_projects", blank=True)
    is_archived = models.BooleanField(default=False)
    is_completed = models.BooleanField(default=False)
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Task(models.Model):
    class Status(models.TextChoices):
        TODO = "todo", "К выполнению"
        IN_PROGRESS = "in_progress", "В работе"
        REVIEW = "review", "На проверке"
        DONE = "done", "Принята"

    class Priority(models.TextChoices):
        LOW = "low", "Низкий"
        MEDIUM = "medium", "Средний"
        HIGH = "high", "Высокий"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    assignee = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_tasks")
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="created_tasks")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.TODO)
    priority = models.CharField(max_length=8, choices=Priority.choices, default=Priority.MEDIUM)
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class TaskEvent(models.Model):
    task = models.ForeignKey(Task, related_name="events", on_delete=models.CASCADE)
    author = models.ForeignKey(User, on_delete=models.PROTECT)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]


class TaskComment(models.Model):
    task = models.ForeignKey(Task, related_name="comments", on_delete=models.CASCADE)
    author = models.ForeignKey(User, on_delete=models.PROTECT)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]


class TaskAttachment(models.Model):
    task = models.ForeignKey(Task, related_name="attachments", on_delete=models.CASCADE)
    author = models.ForeignKey(User, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    size = models.PositiveIntegerField()
    content_type = models.CharField(max_length=120, blank=True)
    data = models.BinaryField()
    created_at = models.DateTimeField(auto_now_add=True)


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    task = models.ForeignKey(Task, null=True, blank=True, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    reminder_key = models.CharField(max_length=120, null=True, blank=True, unique=True)


class WorkspaceSettings(models.Model):
    name = models.CharField(max_length=100, default="TaskControl")
    description = models.TextField(blank=True)
