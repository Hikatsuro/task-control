import requests


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
    def __init__(self, base_url="http://localhost:8000", frontend_url="http://localhost:5173"):
        self.base_url = base_url.rstrip("/")
        self.frontend_url = frontend_url.rstrip("/")
        # Используем Session для автоматического сохранения и отправки cookie (sessionid)
        self.session = requests.Session()

    def login(self, username, password):
        """Авторизация на сервере."""
        url = f"{self.base_url}/api/auth/login/"
        payload = {
            "username": username,
            "password": password
        }
        
        token = self.session.get(f"{self.base_url}/api/auth/csrf/", timeout=10)
        token.raise_for_status()
        response = self.session.post(url, json=payload, headers={"X-CSRFToken": token.json()["csrf_token"]}, timeout=10)
        response.raise_for_status()
        return response.json()

    def get_project_tasks(self, project_id: int):
            """Получает задачи конкретного проекта с проверкой доступа к самому проекту."""
            # 1. Проверяем доступ к проекту: если проект чужой или не существует, сервер вернёт 404
            project_url = f"{self.base_url}/api/projects/{project_id}/"
            project_response = self.session.get(project_url, timeout=10)
            project_response.raise_for_status()
    
            # 2. Если доступ к проекту есть — получаем его задачи
            tasks_url = f"{self.base_url}/api/tasks/"
            response = self.session.get(tasks_url, params={"project_id": project_id}, timeout=10)
            response.raise_for_status()
            
            return format_project_tasks(response.json(), self.frontend_url)
    