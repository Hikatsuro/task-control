# TaskHub — first server version

Python · Django · Django REST Framework · PostgreSQL. Frontend is connected later.

## Run
```
docker compose up -d db          # PostgreSQL
cp .env.example .env && export $(cat .env | xargs)
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser  # gets role=admin
python manage.py runserver
```
Without `POSTGRES_DB` it falls back to SQLite. Tests: `python manage.py test`.

Admin creates users and sets roles at `/admin/` (no user API in this version).

## Schema
User(role: admin|manager|employee) · Customer · Project(customer, manager, members) · Task(project, assignee, status, due_date)
Task statuses: todo → in_progress → review → done (manager can return review → in_progress).

## API (session auth)
POST /api/auth/login/ · POST /api/auth/logout/ · GET /api/auth/me/
GET,POST /api/customers/ · GET,POST /api/projects/ · GET /api/projects/{id}/
GET /api/tasks/?project_id={id} · POST /api/tasks/ · GET,PATCH /api/tasks/{id}/

## Access rules (enforced in core/access.py + views)
| | Admin | Manager | Employee |
|---|---|---|---|
| Projects | none | own | where member |
| Tasks | none | in own projects | assigned to self |
| Customers, create project/task | no | yes | no |
| PATCH task | — | all fields; accept/return | status only: todo→in_progress→review, own tasks |
Inaccessible objects return 404.

## Assumptions to confirm with Hikatsuro
- Customers list is shared among all managers.
- Statuses: todo / in_progress / review / done.
- Comments, files, reports, archiving are not in this version.
