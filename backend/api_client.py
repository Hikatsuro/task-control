import requests

class TaskManagerClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        # Используем Session для автоматического сохранения и отправки cookie (sessionid)
        self.session = requests.Session()

    def login(self, username, password):
        """Авторизация на сервере."""
        url = f"{self.base_url}/api/auth/login/"
        payload = {
            "username": username,
            "password": password
        }
        
        response = self.session.post(url, json=payload)
        response.raise_for_status()
        return response.json()

    def get_project_tasks(self, project_id: int):
        """
        Получает задачи конкретного проекта и собирает необходимые поля:
        название, исполнителя, статус, срок и ссылку на карточку для AI-сводки.
        """
        url = f"{self.base_url}/api/tasks/"
        params = {"project_id": project_id}
        
        response = self.session.get(url, params=params)
        response.raise_for_status()
        
        raw_tasks = response.json()
        formatted_tasks = []
        
        for task in raw_tasks:
            formatted_tasks.append({
                "id": task.get("id"),
                "title": task.get("title"),          # Название
                "assignee": task.get("assignee"),    # Исполнитель (ID)
                "status": task.get("status"),        # Статус (todo, in_progress, review, done)
                "due_date": task.get("due_date"),    # Срок (YYYY-MM-DD или null)
                "card_url": f"{self.base_url}/tasks/{task.get('id')}/"  # Ссылка на карточку задачи
            })
            
        return formatted_tasks
