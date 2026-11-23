import json
import os
from datetime import date
import requests
from openai import OpenAI
try:
    from ml.api_client import format_project_tasks, TaskManagerClient
except ImportError:
    from api_client import format_project_tasks, TaskManagerClient

class ProjectSummaryAgent:
    def __init__(self, task_client: TaskManagerClient, model: str = "gemma4:31b"):
        self.task_client = task_client
        self.model = model
        self.llm = OpenAI(
            base_url="http://localhost:11434/v1",
            api_key="ollama",
        )

        self.tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_project_tasks",
                    "description": "Получить актуальный список задач по ID проекта (название, статус, дедлайн, исполнитель, ссылка на карточку).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "project_id": {
                                "type": "integer",
                                "description": "Уникальный идентификатор проекта",
                            }
                        },
                        "required": ["project_id"],
                    },
                },
            }
        ]

    def generate_summary(self, project_id: int) -> str:
        """
        Вызывается при запросе сводки по проекту.
        Агент вызывает get_project_tasks и формирует понятный ответ со ссылками.
        """
        today_str = date.today().isoformat()

        system_prompt = (
            f"Ты — помощник руководителя проекта. Сегодняшняя дата: {today_str}.\n"
            "Когда руководитель просит сводку по проекту, обязательно вызови инструмент `get_project_tasks`.\n"
            "Правила ответа:\n"
            "1. Отвечай простым, живым и кратким русским языком (например: «Две задачи просрочены, одна ждёт проверки»).\n"
            "2. Просроченными считаются задачи со статусом НЕ `done`, у которых `due_date` меньше сегодняшней даты.\n"
            "3. Статусы: todo — к выполнению, in_progress — в работе, review — на проверке, done — принята.\n"
            "4. Оформляй название каждой упомянутой задачи как кликабельную Markdown-ссылку из поля `card_url`, например: [Передать комплект макетов](http://localhost:5173/app/tasks/7). Не используй слово «ссылка» в качестве текста ссылки.\n"
            "5. Если задач нет или сервер отказал в доступе, сообщи об этом прямо и вежливо."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Сформируй сводку по проекту №{project_id}."},
        ]

        # 1. Запрос к модели с передачей доступного инструмента
        response = self.llm.chat.completions.create(
            model=self.model,
            messages=messages,
            tools=self.tools,
            tool_choice="auto",
        )

        assistant_msg = response.choices[0].message
        messages.append(assistant_msg)

        # 2. Если модель решила вызвать get_project_tasks — выполняем запрос к бэкенду
        if assistant_msg.tool_calls:
            for tool_call in assistant_msg.tool_calls:
                if tool_call.function.name == "get_project_tasks":
                    args = json.loads(tool_call.function.arguments)
                    req_project_id = args.get("project_id", project_id)

                    try:
                        tasks_data = self.task_client.get_project_tasks(req_project_id)
                        tool_result = json.dumps(tasks_data, ensure_ascii=False)
                    except requests.exceptions.HTTPError as e:
                        status_code = e.response.status_code if e.response else "Ошибка"
                        tool_result = json.dumps(
                            {"error": f"Нет доступа к проекту или проект не найден (HTTP {status_code})."},
                            ensure_ascii=False,
                        )

                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": tool_result,
                        }
                    )

            # 3. Получаем итоговую сводку от модели на основе данных с сервера
            final_response = self.llm.chat.completions.create(
                model=self.model,
                messages=messages,
            )
            return final_response.choices[0].message.content

        return assistant_msg.content


if __name__ == "__main__":
    # Инициализация клиента бэкенда
    client = TaskManagerClient(
        base_url="http://localhost:8000",
        frontend_url="http://localhost:5173",
    )

    # Вход под учётной записью руководителя
    client.login(username="demo_manager", password="TaskControl-demo-26")

    # Инициализация агента с моделью gemma4:31b
    agent = ProjectSummaryAgent(task_client=client, model="qwen2.5:3b")

    print("=== Сводка по доступному проекту (ID = 3) ===")
    print(agent.generate_summary(project_id=3))

    print("\n=== Проверка доступа к чужому проекту (ID = 5) ===")
    print(agent.generate_summary(project_id=5))