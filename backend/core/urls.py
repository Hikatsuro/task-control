from django.urls import path

from . import views
from .account import ConfirmReset, RequestReset
from .workspace import TaskFile, TaskFiles, WorkspaceCommands

urlpatterns = [
    path("workspace/", views.WorkspaceView.as_view()),
    path("workspace/commands/", WorkspaceCommands.as_view()),
    path("auth/csrf/", views.CsrfTokenView.as_view()),
    path("auth/login/", views.LoginView.as_view()),
    path("auth/logout/", views.LogoutView.as_view()),
    path("auth/me/", views.MeView.as_view()),
    path("auth/request-reset/", RequestReset.as_view()),
    path("auth/confirm-reset/", ConfirmReset.as_view()),
    path("customers/", views.CustomerListCreate.as_view()),
    path("projects/", views.ProjectListCreate.as_view()),
    path("projects/<int:pk>/", views.ProjectDetail.as_view()),
    path("projects/<int:pk>/members/", views.ProjectMembers.as_view()),
    path("projects/<int:pk>/task-context/", views.ProjectTaskContext.as_view()),
    path("tasks/", views.TaskListCreate.as_view()),
    path("tasks/<int:pk>/", views.TaskDetail.as_view()),
    path("tasks/<int:task_id>/files/", TaskFiles.as_view()),
    path("tasks/<int:task_id>/files/<int:file_id>/", TaskFile.as_view()),
]
