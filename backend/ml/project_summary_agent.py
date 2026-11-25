"""AI-сводка по проекту: модель сама вызывает инструмент чтения задач и пишет короткий отчёт.

Модель работает локально через Ollama, который понимает OpenAI-совместимый API
(POST /v1/chat/completions с tools). Отдельный пакет openai не нужен: хватает requests.

Источник задач передаётся снаружи:
- сайт (core/assistant.py) читает их из базы с правами текущего пользователя;
- консольный запуск ниже читает их по HTTP через TaskManagerClient под учётной записью.
"""
import json
import os
import sys
from datetime import date
from pathlib import Path
from typing import Callable

import requests

if __package__ in (None, ""):
    # Run as a file, Python sees only backend/ml; the backend folder makes «ml» importable.
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from ml.llm import DEFAULT_BASE_URL, DEFAULT_MODEL, AgentUnavailable, ollama_chat  # noqa: E402,F401

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_project_tasks",
            "description": (
                "Получить актуальный список задач по ID проекта "
                "(название, статус, дедлайн, исполнитель, ссылка на карточку)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {"type": "integer", "description": "Уникальный идентификатор проекта"}
                },
                "required": ["project_id"],
            },
        },
    }
]


class TasksUnavailable(Exception):
    """Задачи проекта прочитать нельзя: проекта нет или нет доступа."""


STATUS_NAMES = {"todo": "к выполнению", "in_progress": "в работе", "review": "на проверке", "done": "принята"}


def describe_tasks(tasks, today: date):
    """Facts for the model, counted here rather than by the model: a small model miscounts
    dates and copies examples, so it only has to put these numbers into words."""
    if isinstance(tasks, dict):  # {"error": ...} from the task source
        return tasks
    described, counts = [], {"всего": len(tasks), "просрочено": 0}
    for name in STATUS_NAMES.values():
        counts[name] = 0
    for task in tasks:
        status = STATUS_NAMES.get(task["status"], task["status"])
        counts[status] = counts.get(status, 0) + 1
        due = date.fromisoformat(task["due_date"]) if task.get("due_date") else None
        late = bool(due and task["status"] != "done" and due < today)
        counts["просрочено"] += late
        described.append(
            {
                "id": task["id"],
                **({"проект": task["project_name"]} if task.get("project_name") else {}),
                **({"комментариев": task["comments"]} if "comments" in task else {}),
                "название": task["title"],
                "исполнитель": task.get("assignee") or "не назначен",
                "статус": status,
                "срок": task.get("due_date") or "без срока",
                "просрочена": late,
                "дней просрочки": (today - due).days if late else 0,
                "ссылка": task["card_url"],
            }
        )
    attention = []
    for task in described:
        reasons = []
        if task["просрочена"]:
            reasons.append(f"просрочена на {task['дней просрочки']} дн.")
        if task["статус"] == "на проверке":
            reasons.append("ждёт проверки руководителя")
        if reasons:
            attention.append({**task, "причина": ", ".join(reasons)})
    return {"сегодня": today.isoformat(), "итоги": counts, "требуют внимания": attention, "задачи": described}


def system_prompt(today: str) -> str:
    return (
        f"Ты — помощник руководителя проекта. Сегодня {today}.\n"
        "Чтобы ответить, вызови инструмент `get_project_tasks`. Он вернёт уже посчитанные данные:\n"
        "- «итоги» — сколько задач всего, сколько в каждом статусе и сколько просрочено;\n"
        "- «требуют внимания» — просроченные задачи и задачи на проверке, с причиной;\n"
        "- «задачи» — все задачи с исполнителем, статусом и сроком.\n"
        "Руководитель уже видит итоги и список задач, требующих внимания. Твоя часть — вывод.\n"
        "Правила ответа:\n"
        "1. Пиши два-три коротких предложения простым русским языком, без списков и без ссылок.\n"
        "2. Пиши только по этим данным, ничего не придумывай.\n"
        "3. Если «требуют внимания» пусто, скажи, что по срокам и проверке в проекте всё в порядке.\n"
        "4. Если не пусто, назови главную проблему: самую долгую просрочку или работу, которая ждёт проверки, "
        "с названием задачи и исполнителем.\n"
        "5. Закончи одной конкретной рекомендацией руководителю.\n"
        "6. Если вместо данных пришла ошибка доступа, вежливо сообщи о ней."
    )


class ProjectSummaryAgent:
    def __init__(
        self,
        fetch_tasks: Callable[[int], list],
        model: str = DEFAULT_MODEL,
        base_url: str = DEFAULT_BASE_URL,
        timeout: int = 120,
    ):
        self.fetch_tasks = fetch_tasks
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        # The facts handed to the model on the last run, so the site can show exact totals.
        self.last_facts = None

    def chat(self, messages, tools=None):
        return ollama_chat(self.base_url, self.model, messages, tools, self.timeout)

    def run_tool(self, call, project_id: int) -> str:
        # The summary is about the project the user asked for; another id from the model is ignored.
        try:
            self.last_facts = describe_tasks(self.fetch_tasks(project_id), date.today())
            return json.dumps(self.last_facts, ensure_ascii=False)
        except TasksUnavailable as error:
            return json.dumps({"error": str(error)}, ensure_ascii=False)

    def generate_summary(self, project_id: int) -> str:
        """Вывод модели по проекту (текст). Точные итоги и список задач — в self.last_facts."""
        return self.summarize(project_id)["text"]

    def summarize(self, project_id: int) -> dict:
        """Модель вызывает get_project_tasks и пишет вывод; факты, которые она получила, — рядом.
        {"text": вывод модели, "facts": итоги и задачи, требующие внимания, посчитанные сервером}"""
        self.last_facts = None
        messages = [
            {"role": "system", "content": system_prompt(date.today().isoformat())},
            {"role": "user", "content": f"Сформируй сводку по проекту №{project_id}."},
        ]
        reply = self.chat(messages, TOOLS)
        calls = reply.get("tool_calls") or []
        if not calls:
            # Small models sometimes answer without the tool; give them the data anyway.
            calls = [{"id": "auto", "type": "function", "function": {"name": "get_project_tasks", "arguments": "{}"}}]
            reply = {"role": "assistant", "content": "", "tool_calls": calls}
        messages.append(reply)
        for call in calls:
            if call.get("function", {}).get("name") == "get_project_tasks":
                messages.append(
                    {"role": "tool", "tool_call_id": call.get("id", ""), "content": self.run_tool(call, project_id)}
                )
        final = self.chat(messages)
        return {"text": (final.get("content") or "").strip(), "facts": self.last_facts}


def http_task_reader(client):
    """Task source for the console run: reads over HTTP and turns refusals into TasksUnavailable."""

    def read(project_id: int):
        try:
            return client.get_project_tasks(project_id)
        except requests.HTTPError as error:
            # A requests response is falsy for 4xx/5xx, so it is compared with None.
            code = error.response.status_code if error.response is not None else "нет ответа"
            raise TasksUnavailable(f"Нет доступа к проекту или проект не найден (HTTP {code}).") from error

    return read


def print_summary(agent, project_id: int):
    result = agent.summarize(project_id)
    facts = result["facts"] or {}
    if "итоги" in facts:
        totals = ", ".join(f"{key} — {value}" for key, value in facts["итоги"].items() if value)
        print(f"Итоги: {totals}")
        for task in facts["требуют внимания"]:
            print(f"  • {task['название']} ({task['исполнитель']}): {task['причина']} — {task['ссылка']}")
        if not facts["требуют внимания"]:
            print("  Просроченных задач и задач на проверке нет.")
    print(f"Вывод модели: {result['text']}")


if __name__ == "__main__":
    # Из папки backend, при запущенном сайте на 8080, любым из способов:
    #   .\.venv\Scripts\python.exe -m ml.project_summary_agent
    #   .\.venv\Scripts\python.exe ml\project_summary_agent.py
    from ml.api_client import TaskManagerClient

    client = TaskManagerClient()  # адрес сайта: TASKCONTROL_FRONTEND_URL, по умолчанию 127.0.0.1:8080
    client.login(
        username=os.environ.get("TASKCONTROL_DEMO_USER", "demo_manager"),
        password=os.environ.get("TASKCONTROL_DEMO_PASSWORD", "TaskControl-demo-26"),
    )
    agent = ProjectSummaryAgent(fetch_tasks=http_task_reader(client))

    print("=== Сводка по доступному проекту (ID = 1) ===")
    print_summary(agent, 1)

    print("\n=== Проверка доступа к чужому проекту (ID = 5) ===")
    print_summary(agent, 5)
