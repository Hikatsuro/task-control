from django.urls import path

from . import views

urlpatterns = [
    path("auth/login/", views.LoginView.as_view()),
    path("auth/logout/", views.LogoutView.as_view()),
    path("auth/me/", views.MeView.as_view()),
    path("customers/", views.CustomerListCreate.as_view()),
    path("projects/", views.ProjectListCreate.as_view()),
    path("projects/<int:pk>/", views.ProjectDetail.as_view()),
    path("tasks/", views.TaskListCreate.as_view()),
    path("tasks/<int:pk>/", views.TaskDetail.as_view()),
]
