"""Populate a local database with fictional TaskControl records."""
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from core.models import Customer, Department, Notification, Project, Role, Task, TaskAttachment, TaskComment, TaskEvent, User, WorkspaceSettings

today = timezone.localdate()


def account(username, name, role, department, position):
    user, created = User.objects.get_or_create(username=username, defaults={
        "first_name": name, "role": role, "department": department, "position": position,
        "email": f"{username}@taskcontrol.example",
    })
    if created:
        user.set_password("TaskControl-demo-26")
        user.save(update_fields=["password"])
    return user


def project(name, organization, owner, members, start, end, state="active"):
    customer, _ = Customer.objects.get_or_create(name=organization, created_by=owner, defaults={
        "contact": "Отдел проектов", "email": f"client-{owner.pk}@example.test", "notes": "Вымышленный заказчик.",
    })
    item, created = Project.objects.get_or_create(name=name, manager=owner, defaults={
        "customer": customer, "description": f"Согласование и приёмка материалов проекта «{name}».",
        "start_date": today + timedelta(days=start), "due_date": today + timedelta(days=end),
        "is_archived": state == "archived", "is_completed": state == "completed",
    })
    if created:
        item.members.set(members)
    return item


def task(project, title, assignee, status, days, priority):
    item, created = Task.objects.get_or_create(project=project, title=title, defaults={
        "assignee": assignee, "created_by": project.manager, "status": status, "priority": priority,
        "due_date": today + timedelta(days=days), "description": f"Подготовить результат по задаче «{title}» и передать его на проверку.",
        "completed_at": timezone.now() - timedelta(days=max(0, -days)) if status == Task.Status.DONE else None,
    })
    if created:
        TaskEvent.objects.create(task=item, author=project.manager, text="Задача создана и назначен исполнитель")
        if status == Task.Status.REVIEW:
            TaskEvent.objects.create(task=item, author=assignee, text="В работе → На проверке")
            Notification.objects.create(user=project.manager, task=item, title="Задача ожидает проверки", body=title)
        elif status == Task.Status.DONE:
            TaskEvent.objects.create(task=item, author=project.manager, text="На проверке → Принята")
        elif status == Task.Status.TODO and assignee:
            Notification.objects.create(user=assignee, task=item, title="Вам назначена задача", body=title)
    return item, created


with transaction.atomic():
    product, _ = Department.objects.get_or_create(name="Разработка", defaults={"description": "Интерфейс, API и выпуск проектов."})
    design, _ = Department.objects.get_or_create(name="Дизайн и качество", defaults={"description": "Прототипы, проверка форм и приёмка."})
    account("demo_admin", "Администратор демо", Role.ADMIN, product, "Управление доступом")
    manager = account("demo_manager", "Мария Волкова", Role.MANAGER, product, "Руководитель")
    employee = account("demo_employee", "Алексей Орлов", Role.EMPLOYEE, product, "Фронтенд")
    reviewer = account("demo_designer", "Анна Соколова", Role.EMPLOYEE, design, "Дизайн и проверка")
    other_manager = account("demo_other_manager", "Ирина Романова", Role.MANAGER, design, "Руководитель другой команды")
    WorkspaceSettings.objects.get_or_create(pk=1, defaults={"name": "TaskControl Demo", "description": "Учебная команда по разработке корпоративных сервисов."})
    portal = project("Корпоративный портал", "Бюро Север", manager, [employee, reviewer], -12, 21)
    forma = project("Сайт студии Forma", "Студия Forma", manager, [employee, reviewer], -5, 16)
    archive = project("Личный кабинет заказчика", "Мастерская Линия", manager, [employee], -40, -10, "archived")
    complete = project("База знаний для новых сотрудников", "Бюро Север", manager, [reviewer], -20, -2, "completed")
    private = project("Проект другой команды", "Бюро Вектор", other_manager, [], -3, 10)
    review, created = task(portal, "Проверить макет карточки задачи", employee, Task.Status.REVIEW, 0, "high")
    if created:
        TaskComment.objects.create(task=review, author=employee, text="Макет готов. Добавил историю и состояние просроченной задачи.")
        TaskComment.objects.create(task=review, author=manager, text="Проверю форму возврата и подписи статусов.")
        brief = "Карточка задачи: исполнитель, срок, описание, статус и история изменений.\n".encode("utf-8")
        TaskAttachment.objects.create(task=review, author=employee, name="Критерии-приёмки.txt", size=len(brief), content_type="text/plain", data=brief)
    task(portal, "Настроить фильтры по срокам", employee, Task.Status.IN_PROGRESS, -2, "high")
    task(portal, "Добавить экран списка проектов", employee, Task.Status.TODO, 4, "medium")
    task(portal, "Согласовать права ролей", reviewer, Task.Status.DONE, -3, "medium")
    task(forma, "Утвердить структуру главной", reviewer, Task.Status.REVIEW, 1, "medium")
    task(forma, "Подготовить адаптивную сетку", employee, Task.Status.TODO, 8, "low")
    task(archive, "Передать комплект макетов", employee, Task.Status.DONE, -13, "medium")
    task(complete, "Собрать инструкции по запуску", reviewer, Task.Status.DONE, -3, "low")
    task(private, "Уточнить требования проекта", other_manager, Task.Status.IN_PROGRESS, 2, "medium")
