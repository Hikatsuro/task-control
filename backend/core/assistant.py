"""AI-помощник на сайте: локальная модель (Ollama) отвечает по задачам пользователя.

POST /api/assistant/summary/  {"project_id": 3}
    -> {"summary", "model", "totals", "attention"} — сводка по проекту.
POST /api/assistant/chat/     {"messages": [{"role": "user", "content": "..."}], "project_id": 3 | null}
    -> {"answer", "model", "tools"} — свободный вопрос; project_id — проект, открытый в интерфейсе.

Ограничения:
- модель видит только то, что пользователь и так видит в кабинете: каждый инструмент читает
  данные через projects_for / tasks_for с правами текущего пользователя;
- только чтение: среди инструментов нет ни одного, который что-то меняет;
- администратору помощник недоступен: рабочих данных у этой роли нет;
- длина вопроса и истории ограничены, запросы — не чаще AI_RATE (settings.DEFAULT_THROTTLE_RATES).
"""
from datetime import date

from django.conf import settings
from django.db.models import Count
from rest_framework import serializers
from rest_framework.exceptions import APIException, NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from ml.api_client import format_project_tasks
from ml.chat_agent import ChatAgent
from ml.project_summary_agent import AgentUnavailable, ProjectSummaryAgent, describe_tasks

from .access import projects_for, tasks_for
from .models import Role
from .serializers import TaskSerializer

MAX_QUESTION = 1000  # символов в вопросе
MAX_ANSWER_IN_HISTORY = 4000  # символов в прошлом ответе помощника
MAX_HISTORY = 12  # сообщений диалога, включая текущий вопрос
TEXT_LIMIT = 1500  # символов описания задачи, отдаваемых модели
LIST_LIMIT = 10  # последних комментариев и событий истории


class AssistantUnavailable(APIException):
    status_code = 503
    default_detail = "AI-помощник недоступен."
    default_code = "assistant_unavailable"


def person_name(user):
    if user is None:
        return None
    return f"{user.first_name} {user.last_name}".strip() or user.username


def task_rows(user, tasks):
    """Tasks in the shape the agents read: names instead of ids, links to the cards."""
    tasks = tasks.select_related("assignee", "project").annotate(comment_count=Count("comments")).order_by("id")
    rows = format_project_tasks(TaskSerializer(tasks, many=True).data, settings.TASKCONTROL_FRONTEND_URL)
    by_id = {t.id: t for t in tasks}
    return [
        {
            **row,
            "assignee": person_name(by_id[row["id"]].assignee),
            "project_name": by_id[row["id"]].project.name,
            "comments": by_id[row["id"]].comment_count,
        }
        for row in rows
    ]


class UserTools:
    """Инструменты агентов с правами одного пользователя. Только чтение."""

    def __init__(self, user):
        self.user = user

    def project_tasks(self, project_id):
        project = projects_for(self.user).filter(pk=project_id).first()
        if project is None:
            return {"ошибка": "Нет доступа к проекту или проект не найден."}
        return task_rows(self.user, tasks_for(self.user).filter(project=project))

    # --- chat tools -----------------------------------------------------------------------
    def list_projects(self):
        today = date.today()
        projects = projects_for(self.user).select_related("customer").order_by("id")
        return [
            {
                "id": p.id,
                "название": p.name,
                "заказчик": p.customer.name,
                "срок": p.due_date,
                "завершён": p.is_completed,
                "в архиве": p.is_archived,
                "итоги": describe_tasks(task_rows(self.user, tasks_for(self.user).filter(project=p)), today)["итоги"],
            }
            for p in projects
        ]

    def get_project_tasks(self, project_id):
        try:
            project_id = int(project_id)
        except (TypeError, ValueError):
            return {"ошибка": "Нужен числовой id проекта."}
        return describe_tasks(self.project_tasks(project_id), date.today())

    def get_all_tasks(self):
        return describe_tasks(task_rows(self.user, tasks_for(self.user)), date.today())

    def get_task(self, task_id):
        try:
            task_id = int(task_id)
        except (TypeError, ValueError):
            return {"ошибка": "Нужен числовой id задачи."}
        task = tasks_for(self.user).filter(pk=task_id).select_related("project", "assignee").first()
        if task is None:
            return {"ошибка": "Нет доступа к задаче или задача не найдена."}
        facts = describe_tasks(task_rows(self.user, tasks_for(self.user).filter(pk=task.pk)), date.today())
        card = facts["задачи"][0]
        comments = task.comments.select_related("author").order_by("-created_at")[:LIST_LIMIT]
        events = task.events.select_related("author").order_by("-created_at")[:LIST_LIMIT]
        return {
            **card,
            "приоритет": task.get_priority_display(),
            "описание": task.description[:TEXT_LIMIT],
            "комментарии": [
                {"автор": person_name(c.author), "дата": c.created_at.date(), "текст": c.text[:500]}
                for c in reversed(comments)
            ],
            "история": [
                {"автор": person_name(e.author), "дата": e.created_at.date(), "событие": e.text[:300]}
                for e in reversed(events)
            ],
            "файлы": list(task.attachments.values_list("name", flat=True)),
        }

    def chat_tools(self):
        return {
            "list_projects": self.list_projects,
            "get_project_tasks": self.get_project_tasks,
            "get_all_tasks": self.get_all_tasks,
            "get_task": self.get_task,
        }


def named_tasks(user, question, limit=2):
    """Ids of the user's tasks whose titles appear in the question (case ignored)."""
    text = question.casefold()
    found = [
        (text.find(title.casefold()), pk)
        for pk, title in tasks_for(user).values_list("id", "title")
        if len(title) >= 4 and title.casefold() in text
    ]
    return [pk for _, pk in sorted(found)[:limit]]


def agent_options():
    return {
        "model": settings.TASKCONTROL_AI_MODEL,
        "base_url": settings.OLLAMA_BASE_URL,
        "timeout": settings.TASKCONTROL_AI_TIMEOUT,
    }


def make_agent(user):
    return ProjectSummaryAgent(fetch_tasks=UserTools(user).project_tasks, **agent_options())


class AssistantView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "assistant"

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.user.role == Role.ADMIN:
            raise PermissionDenied("AI-помощник работает с задачами: он доступен руководителю и сотрудникам.")


class SummaryRequest(serializers.Serializer):
    project_id = serializers.IntegerField(min_value=1)


class ProjectSummary(AssistantView):
    def post(self, request):
        body = SummaryRequest(data=request.data)
        body.is_valid(raise_exception=True)
        project_id = body.validated_data["project_id"]
        if not projects_for(request.user).filter(pk=project_id).exists():
            raise NotFound("Проект не найден или недоступен.")
        try:
            result = make_agent(request.user).summarize(project_id)
        except AgentUnavailable as error:
            raise AssistantUnavailable(str(error)) from error
        facts = result["facts"] or {}
        # Totals and the attention list are counted by the server, so they are always exact;
        # the model's part is the conclusion and the recommendation.
        attention = [
            {
                "title": task["название"],
                "assignee": task["исполнитель"],
                "reason": task["причина"],
                "url": task["ссылка"],
            }
            for task in facts.get("требуют внимания", [])
        ]
        return Response(
            {
                "summary": result["text"],
                "model": settings.TASKCONTROL_AI_MODEL,
                "totals": facts.get("итоги"),
                "attention": attention,
            }
        )


class ChatMessage(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(max_length=MAX_ANSWER_IN_HISTORY, trim_whitespace=True)


class ChatRequest(serializers.Serializer):
    messages = ChatMessage(many=True, allow_empty=False)
    project_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)

    def validate_messages(self, messages):
        if len(messages) > MAX_HISTORY:
            raise serializers.ValidationError(f"Не больше {MAX_HISTORY} сообщений в диалоге.")
        if messages[-1]["role"] != "user":
            raise serializers.ValidationError("Последним должен быть вопрос пользователя.")
        if len(messages[-1]["content"]) > MAX_QUESTION:
            raise serializers.ValidationError(f"Вопрос длиннее {MAX_QUESTION} символов.")
        return messages


class AssistantChat(AssistantView):
    def post(self, request):
        body = ChatRequest(data=request.data)
        body.is_valid(raise_exception=True)
        context = "Пользователь не выбрал проект: речь может идти о любом его проекте."
        project_id = body.validated_data.get("project_id")
        if project_id is not None:
            project = projects_for(request.user).filter(pk=project_id).first()
            if project is None:
                raise NotFound("Проект не найден или недоступен.")
            context = f"Пользователь сейчас смотрит проект «{project.name}» (id {project.id})."
        role = "руководитель" if request.user.role == Role.MANAGER else "сотрудник"
        names = ", ".join(f"«{name}»" for name in projects_for(request.user).order_by("id").values_list("name", flat=True))
        context += f" Пользователь — {role} {person_name(request.user)}. Проекты пользователя: {names or 'нет'}."
        agent = ChatAgent(UserTools(request.user).chat_tools(), **agent_options())
        # The model does not always decide to look at the data on its own, so what it needs most
        # is loaded before it answers: the open project or all the user's projects, and the cards
        # of tasks the question names.
        question = body.validated_data["messages"][-1]["content"]
        preload = [("get_project_tasks", {"project_id": project_id}) if project_id else ("get_all_tasks", {})]
        preload += [("get_task", {"task_id": task_id}) for task_id in named_tasks(request.user, question)]
        try:
            result = agent.answer(body.validated_data["messages"], context, preload)
        except AgentUnavailable as error:
            raise AssistantUnavailable(str(error)) from error
        return Response({"answer": result["text"], "model": settings.TASKCONTROL_AI_MODEL, "tools": result["tools"]})
