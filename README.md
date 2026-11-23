# Планирование и контроль задач

Учебный веб-сервис для небольших команд, которые выполняют проекты для заказчиков. Руководитель назначает задачи, следит за сроками и принимает результат. Исполнители видят поручения и отправляют выполненную работу на проверку.

## Связь с дипломом

Тема — «Информационная система для планирования и контроля выполнения задач сотрудниками». Автор — Мизам Адак. Учебный проект покрывает веб-сценарий от проекта заказчика до приёмки результата. Для курса добавляются тестовая оплата, AI-сводка и ML-оценка риска просрочки. Android-приложение остаётся отдельным этапом диплома.

## Команда

Контакт тимлида нужно добавить перед сдачей.

| Участник | Роль | Ответственность |
|---|---|---|
| Мизам Адак | Тимлид / Frontend | Сценарии, интерфейс, координация и питч |
| Казагашева Виктория | AI / ML / QA | Агент, модель и проверка сценариев |
| Айтказин Танатар | Backend / DevOps | База данных, API, оплата и Docker |

## Стек и запланированные интеграции

- React, TypeScript и Vite для веб-интерфейса.
- Django и Django REST Framework для ролей, бизнес-правил и API.
- PostgreSQL для связанных данных и истории задач.
- PayPal Sandbox (Orders API) для тестовой оплаты 30 дней доступа к аналитике команды. Платёж проходит через тестовый аккаунт PayPal без списания реальных денег. После подтверждения платежа сервер открывает доступ к аналитике.
- OpenAI Responses API с вызовом функции чтения задач для AI-агента.
- Python, pandas и scikit-learn для подготовки данных и классификации риска просрочки.
- Docker Compose для одинакового запуска сайта и базы данных.

## Структура

- `frontend/` — React-приложение, стили и сценарии интерфейса.
- `backend/` — Django-приложение, API и интеграции.
- `ml/` — подготовка данных, обучение и оценка модели.
- `docs/` — материалы Milestone 1.
- `docker-compose.yml`, `.env.example` — запуск всего проекта одной командой.

## Запуск через Docker Compose

Понадобится только [Docker](https://docs.docker.com/get-docker/) с Compose v2. Compose поднимает три контейнера: `db` (PostgreSQL 16), `backend` (Django + gunicorn) и `frontend` (nginx со сборкой React). Nginx отдаёт сайт и проксирует `/api`, `/admin` и `/static` в Django, поэтому сайт и API работают с одного адреса, а сессия и CSRF — без настройки CORS.

1. Создайте файл с переменными окружения.

   ```sh
   cp .env.example .env            # PowerShell: Copy-Item .env.example .env
   ```

2. При необходимости измените значения в `.env`.

   | Переменная | Назначение | По умолчанию |
   |---|---|---|
   | `DJANGO_SECRET_KEY` | Секретный ключ Django. Обязателен; для показа подойдёт любая строка, для публикации задайте длинную случайную. | `change-me-for-local-demo` |
   | `DJANGO_DEBUG` | `1` включает режим отладки. | `0` |
   | `DJANGO_ALLOWED_HOSTS` | Допустимые хосты через запятую. | `localhost,127.0.0.1,backend` |
   | `TASKCONTROL_PORT` | Порт сайта на вашем компьютере. | `8080` |
   | `TASKCONTROL_FRONTEND_URL` | Адрес сайта в браузере. Используется в письмах восстановления пароля и для возврата из PayPal. Должен совпадать с `TASKCONTROL_PORT`. | `http://127.0.0.1:8080` |
   | `TASKCONTROL_SEED_DEMO` | `1` — при старте заполнить БД вымышленными данными. | `1` |
   | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Параметры PostgreSQL. | `taskcontrol` |
   | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Ключи приложения PayPal Sandbox (см. ниже). Без них оплата отключена, остальной сайт работает. | пусто |
   | `PAYPAL_API_BASE` | Адрес PayPal API. | `https://api-m.sandbox.paypal.com` |

3. Соберите и запустите проект.

   ```sh
   docker compose up --build
   ```

   При старте контейнера `backend` автоматически выполняются:
   - `python manage.py migrate` — применение миграций к PostgreSQL;
   - `python manage.py collectstatic` — статика админки;
   - заполнение БД тестовыми данными (`seed_full_demo.py`), если `TASKCONTROL_SEED_DEMO=1`. Заполнение идемпотентно: повторный запуск добавляет только отсутствующие записи и не затирает изменения.

   Контейнер `backend` ждёт, пока PostgreSQL пройдёт проверку готовности, поэтому порядок запуска соблюдать не нужно.

4. Откройте <http://127.0.0.1:8080/login>. Логины и пароль — в разделе «Что показать» ниже.

Полезные команды:

```sh
docker compose up -d                                  # в фоне
docker compose logs -f backend                        # журнал Django
docker compose exec backend python manage.py createsuperuser   # администратор Django
docker compose exec backend python manage.py test core         # тесты API и оплаты
docker compose down                                   # остановить, данные сохранятся
docker compose down -v                                # остановить и удалить БД
```

Если вы изменили код, пересоберите образы: `docker compose up --build`.

## Тестовая оплата через PayPal Sandbox

1. Войдите на <https://developer.paypal.com> → **Apps & Credentials** → режим **Sandbox** → **Create App**. Скопируйте *Client ID* и *Secret* в `.env` (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`) и перезапустите `backend`: `docker compose up -d`.
2. В **Testing Tools → Sandbox Accounts** возьмите тестовый аккаунт покупателя (Personal). Реальный аккаунт PayPal не используйте.
3. Войдите как `demo_manager`, откройте **Тариф** → «Оплатить через PayPal» и подтвердите платёж тестовым покупателем.

Как это работает:

- Сервер создаёт заказ в PayPal (`POST /api/billing/orders/`) и возвращает ссылку на оплату. Ключи PayPal в браузер не попадают.
- После возврата на сайт сервер сам захватывает платёж (`POST /api/billing/orders/capture/`), сверяет статус и сумму с заказом и только затем продлевает тариф на 30 дней. Повторное открытие страницы результата тариф не продлевает.
- Кнопка «Отменить» в PayPal ведёт на страницу результата, где заказ помечается отменённым (`POST /api/billing/orders/cancel/`), тариф не меняется.
- Заказ видит и подтверждает только тот руководитель, который его создал.

## Запуск на компьютере без Docker

Понадобятся Python 3.12 и Node.js 22.12+ или 24 LTS. Откройте два терминала из корня проекта.

В первом запустите Django. Команды ниже для PowerShell.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py shell -c "import seed_full_demo"
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8012
```

Во втором запустите React.

```powershell
cd frontend
npm ci
npm run dev -- --port 5187
```

Откройте [страницу входа](http://127.0.0.1:5187/login). Локальный запуск по умолчанию использует SQLite. Для PostgreSQL до запуска передайте `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST` и `POSTGRES_PORT` через окружение. База PostgreSQL должна быть предварительно создана. Для проверки оплаты передайте `PAYPAL_CLIENT_ID` и `PAYPAL_CLIENT_SECRET` в окружение Django (адрес возврата — `TASKCONTROL_FRONTEND_URL=http://127.0.0.1:5187`).

## Что показать

| Логин | Что открыть |
| --- | --- |
| `demo_manager` | Обзор, проекты и заказчики, отчёты, просрочки и приёмка задачи, оплата тарифа |
| `demo_employee` | Мои задачи, обсуждение, файл и отправка на проверку |
| `demo_admin` | Пользователи, отделы, настройки команды |

Пароль всех вымышленных аккаунтов — `TaskControl-demo-26`. Повторное заполнение добавляет отсутствующие демонстрационные записи и сохраняет сделанные изменения.

Проект «Корпоративный портал» содержит задачу «Проверить макет карточки задачи» на проверке. В ней есть комментарии, история и файл с критериями. «Настроить фильтры по срокам» показывает просрочку. В календаре и отчёте используются те же серверные задачи.

Настройки тем действуют на текущий браузер. Предпочтения уведомлений и профиль хранятся на сервере. В локальном режиме письма восстановления выводятся в терминал Django (в Docker — в `docker compose logs backend`). Для учебного показа скачивание файлов доступно только пользователям, которые видят задачу.

Проверка: `python manage.py test core` из `backend/`, `npm run lint`, `npm run test` и `npm run build` из `frontend/`. Реальные AI и ML отложены. Локальные 3D-модели можно подключить через `TASKCONTROL_LOCAL_MODELS_DIR`, как описано в `frontend/README.md`.

## Материалы Milestone 1

- [Презентация](docs/milestone-1-pitch.pdf) и [сценарий выступления](docs/pitch-notes.md).
- [Архитектура](docs/architecture.pdf) и [редактируемая схема Mermaid](docs/architecture.md).
- [Диаграмма Ганта](docs/gantt.pdf) и [редактируемый график](docs/gantt.md).
- [Задачи для GitHub Projects](docs/milestone-2-issues.md).
- [Макет в Figma](https://www.figma.com/design/8Rf9aPYkX14NCWcBZDIPU5?node-id=2-3022).

После публикации добавить сюда ссылку на GitHub Projects и проверить, что преподаватель может открыть репозиторий и проект. Ветки `main` и `dev` создаются по [инструкции](docs/submission.md).
