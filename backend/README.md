# TaskControl — backend

Django и Django REST Framework. Инструкции запуска, заполнение базы и логины для показа приведены в [README проекта](../README.md).

- `core/models.py` и `core/migrations/` — модели и история схемы базы.
- `core/access.py` — правила доступа к проектам и задачам.
- `core/workspace.py` — данные кабинета, операции и вложения.
- `core/account.py` — восстановление пароля.
- `seed_full_demo.py` — заполнение вымышленными данными.

Авторизация использует Django Sessions и CSRF. Контракт API проектов и задач описан в [README_API_FRONTEND.md](./README_API_FRONTEND.md). Кабинет дополнительно читает `GET /api/workspace/` и сохраняет изменения через `POST /api/workspace/commands/`.
