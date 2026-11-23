## Запуск AI-агента для сводок по проектам

Модуль расположен в директории `backend/ml/` и формирует текстовые сводки по задачам проекта с учётом прав доступа текущего пользователя.

### 1. Установка зависимостей и запуск бэкенда

1. Перейдите в папку `backend`, создайте и активируйте виртуальное окружение:

   cd backend
   python -m venv .venv
   # Для Windows (CMD):
   .venv\Scripts\activate
   # Для Linux/macOS:
   source .venv/bin/activate

Установите зависимости проекта (использование python -m pip исключает ошибки, если папка Scripts не добавлена в PATH на Windows):

    python -m pip install -r requirements.txt
    python -m pip install whitenoise openai requests

Примените миграции и наполните базу тестовыми пользователями и проектами:

    python manage.py migrate
    python manage.py shell -c "ns = {}; exec(open('seed_full_demo.py', encoding='utf-8').read(), ns); [f() for k, f in ns.items() if callable(f) and k in ('main', 'run', 'seed', 'seed_demo', 'populate')]"

Запустите сервер разработки Django (не закрывайте это окно терминала):

    python manage.py runserver

Сервер будет доступен по адресу http://localhost:8000.

2. Локальная установка Ollama

Скачайте и установите Ollama для вашей операционной системы.

Перезапустите окно терминала (чтобы система распознала команду ollama) и скачайте модель с поддержкой вызова инструментов (Tool Calling), например qwen2.5:7b или llama3.1:

    ollama run qwen2.5:3b

# Если ключ не загружается из .env автоматически, задайте его в сессии терминала(ключ в закрепе в телеграме):
# Windows (CMD): set OLLAMA_API_KEY=ваш_секретный_ключ
# Linux/macOS:   export OLLAMA_API_KEY=ваш_секретный_ключ

    python ml/project_summary_agent.py

Тестовые учётные данные (из seed_full_demo.py):
Руководитель: логин demo_manager, пароль TaskControl-demo-26 (доступны проекты с ID 1, 2, 3, 4).

Чужой проект для проверки прав доступа: проект ID 5 (принадлежит demo_other_manager, при запросе вернёт ошибку доступа 404).