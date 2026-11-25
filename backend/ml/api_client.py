import os

import requests

# One address for the site and the API: Vite (local run) and nginx (Docker) both pass /api
# on to Django, so card links and API calls share the origin the browser uses.
DEFAULT_SITE_URL = os.environ.get("TASKCONTROL_FRONTEND_URL", "http://127.0.0.1:8080")


def format_project_tasks(tasks, frontend_url=""):
    """Build the task context used by the Python client and the Django endpoint."""
    return [
        {
            "id": task["id"],
            "title": task["title"],
            "assignee": task["assignee"],
            "status": task["status"],
            "due_date": task["due_date"],
            "card_url": f"{frontend_url}/app/tasks/{task['id']}",
        }
        for task in tasks
    ]


class TaskManagerClient:
    """Reads TaskControl over HTTP with a normal user session (sign-in, cookie, CSRF)."""

    def __init__(self, base_url=DEFAULT_SITE_URL, frontend_url=None):
        self.base_url = base_url.rstrip("/")
        self.frontend_url = (frontend_url or base_url).rstrip("/")
        # Session keeps the sessionid cookie between requests.
        self.session = requests.Session()

    def login(self, username, password):
        """Авторизация на сервере."""
        token = self.session.get(f"{self.base_url}/api/auth/csrf/", timeout=10)
        token.raise_for_status()
        response = self.session.post(
            f"{self.base_url}/api/auth/login/",
            json={"username": username, "password": password},
            headers={"X-CSRFToken": token.json()["csrf_token"]},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()

    def get_project_tasks(self, project_id: int):
        """Задачи проекта для AI-сводки: название, исполнитель, статус, срок и ссылка на карточку.
        Сначала проверяется доступ к самому проекту: чужой или несуществующий даёт 404."""
        project = self.session.get(f"{self.base_url}/api/projects/{project_id}/", timeout=10)
        project.raise_for_status()

        response = self.session.get(
            f"{self.base_url}/api/tasks/", params={"project_id": project_id}, timeout=10
        )
        response.raise_for_status()
        tasks = format_project_tasks(response.json(), self.frontend_url)
        names = self.people_names(project_id)
        return [{**task, "assignee": names.get(task["assignee"], task["assignee"])} for task in tasks]

    def people_names(self, project_id: int):
        """Имена исполнителей: задачи отдают только id. Участников проекта видит руководитель,
        себя — любой пользователь; кого узнать не удалось, остаётся под номером."""
        people = []
        members = self.session.get(f"{self.base_url}/api/projects/{project_id}/members/", timeout=10)
        if members.ok:
            people += members.json()
        me = self.session.get(f"{self.base_url}/api/auth/me/", timeout=10)
        if me.ok:
            people.append(me.json())
        return {
            p["id"]: f"{p.get('first_name', '')} {p.get('last_name', '')}".strip() or p["username"]
            for p in people
        }
