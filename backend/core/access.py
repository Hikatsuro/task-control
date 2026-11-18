"""Единое место, где сервер решает, какие данные видит пользователь.

Администратор управляет системой (пользователи, роли), но рабочие данные
(проекты, задачи) ему автоматически не выдаются.
"""
from .models import Project, Role, Task


def projects_for(user):
    if user.role == Role.MANAGER:
        return Project.objects.filter(manager=user)
    if user.role == Role.EMPLOYEE:
        return Project.objects.filter(members=user)
    return Project.objects.none()


def tasks_for(user):
    if user.role == Role.MANAGER:
        return Task.objects.filter(project__manager=user)
    if user.role == Role.EMPLOYEE:
        return Task.objects.filter(assignee=user, project__members=user)
    return Task.objects.none()
