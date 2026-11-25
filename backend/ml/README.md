# ml — AI-агенты: сводка по проекту и чат

Модуль отвечает на вопросы о задачах с учётом прав доступа текущего пользователя. Модель работает на этом компьютере через Ollama и сама вызывает инструменты чтения задач.

- `llm.py` — обращение к Ollama (OpenAI-совместимый API) через `requests`, общая ошибка «модель недоступна».
- `api_client.py` — клиент API TaskControl: вход под учётной записью, чтение задач проекта с проверкой доступа к проекту, имена исполнителей. `format_project_tasks` — данные задачи для сводки.
- `project_summary_agent.py` — сводка по проекту. `describe_tasks` заранее считает итоги и задачи, требующие внимания (просроченные и на проверке), чтобы модели не приходилось считать даты; модель пишет вывод и рекомендацию.
- `chat_agent.py` — чат: модель сама вызывает инструменты `list_projects`, `get_project_tasks`, `get_all_tasks`, `get_task`, не больше 4 раз на ответ. Только чтение; тексты задач и комментариев для модели — данные, а не команды.
- На сайте агентов использует `core/assistant.py` (`POST /api/assistant/summary/`, `POST /api/assistant/chat/`), страница «AI-помощник»: инструменты читают данные с правами текущего пользователя, администратору помощник недоступен, длина вопроса и истории и частота запросов ограничены.

## 1. Зависимости и сервер

Команды для PowerShell из корня полной версии (`output/taskcontrol-full`).

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py shell -c "import seed_full_demo"
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Отдельных пакетов для агента не нужно: запросы к Ollama идут через `requests` (OpenAI-совместимый API Ollama), ключ API не требуется.

Во втором терминале запустите сайт — агент обращается к API по адресу сайта:

```powershell
cd frontend
npm ci
npm run dev -- --port 8080
```

## 2. Ollama

1. Установите Ollama: `winget install --id Ollama.Ollama -e` или установщик с <https://ollama.com/download>. Откройте новый терминал, чтобы команда `ollama` стала доступна.
2. Скачайте модель с поддержкой вызова инструментов:

   ```powershell
   ollama pull qwen2.5:3b
   ```

   Более точные выводы даёт `qwen2.5:7b` (около 4,7 ГБ, отвечает медленнее). Модель задаётся в `backend/.env`: `TASKCONTROL_AI_MODEL=qwen2.5:7b`.

## 3. Запуск агента из консоли

Из папки `backend`, при запущенных Django и сайте, любым способом:

```powershell
.\.venv\Scripts\python.exe -m ml.project_summary_agent
.\.venv\Scripts\python.exe ml\project_summary_agent.py
```

Скрипт входит как руководитель и печатает сводку по проекту 1, затем проверяет отказ в доступе на чужом проекте 5.

Демонстрационные данные (`seed_full_demo.py`):

- руководитель — логин `demo_manager`, пароль `TaskControl-demo-26`, доступны проекты 1–4;
- чужой проект — 5 («Проект другой команды», руководитель `demo_other_manager`): сервер отвечает 404, агент сообщает, что доступа нет.

Другая учётная запись и адрес сайта задаются переменными `TASKCONTROL_DEMO_USER`, `TASKCONTROL_DEMO_PASSWORD` и `TASKCONTROL_FRONTEND_URL`.

Здесь же появятся скрипты подготовки данных, обучения и проверки модели риска просрочки.
