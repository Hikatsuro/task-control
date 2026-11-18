from rest_framework.test import APIClient, APITestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from .models import Customer, Project, Role, Task, User


class AccessTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        mk = lambda n, r: User.objects.create_user(n, password="pw", role=r)
        cls.admin = mk("admin", Role.ADMIN)
        cls.m1, cls.m2 = mk("m1", Role.MANAGER), mk("m2", Role.MANAGER)
        cls.e1, cls.e2 = mk("e1", Role.EMPLOYEE), mk("e2", Role.EMPLOYEE)
        cust = Customer.objects.create(name="ACME", created_by=cls.m1)
        cls.p1 = Project.objects.create(name="P1", customer=cust, manager=cls.m1)
        cls.p1.members.add(cls.e1)
        cls.p2 = Project.objects.create(name="P2", customer=cust, manager=cls.m2)
        cls.p2.members.add(cls.e2)
        cls.t1 = Task.objects.create(project=cls.p1, title="T1", assignee=cls.e1, created_by=cls.m1)
        cls.t2 = Task.objects.create(project=cls.p2, title="T2", assignee=cls.e2, created_by=cls.m2)

    def as_(self, user):
        c = APIClient()
        c.force_login(user)
        return c

    def test_login_logout_me(self):
        c = APIClient()
        self.assertEqual(c.get("/api/auth/me/").status_code, 403)
        self.assertEqual(c.post("/api/auth/login/", {"username": "m1", "password": "bad"}).status_code, 401)
        r = c.post("/api/auth/login/", {"username": "m1", "password": "pw"})
        self.assertEqual(r.json()["role"], "manager")
        self.assertEqual(c.get("/api/auth/me/").json()["username"], "m1")
        self.assertEqual(c.post("/api/auth/logout/").status_code, 204)
        self.assertEqual(c.get("/api/auth/me/").status_code, 403)

    def test_manager_sees_only_own(self):
        c = self.as_(self.m1)
        self.assertEqual([p["id"] for p in c.get("/api/projects/").json()], [self.p1.id])
        self.assertEqual(c.get(f"/api/projects/{self.p2.id}/").status_code, 404)
        self.assertEqual([t["id"] for t in c.get("/api/tasks/").json()], [self.t1.id])
        self.assertEqual(c.get(f"/api/tasks/?project_id={self.p2.id}").json(), [])
        self.assertEqual(c.get(f"/api/tasks/{self.t2.id}/").status_code, 404)

    def test_employee_sees_only_assigned(self):
        c = self.as_(self.e1)
        self.assertEqual([p["id"] for p in c.get("/api/projects/").json()], [self.p1.id])
        self.assertEqual([t["id"] for t in c.get("/api/tasks/").json()], [self.t1.id])
        self.assertEqual(c.get(f"/api/tasks/{self.t2.id}/").status_code, 404)
        self.assertEqual(c.get("/api/customers/").status_code, 403)
        self.assertEqual(c.post("/api/projects/", {}).status_code, 403)
        self.assertEqual(c.post("/api/tasks/", {}).status_code, 403)

    def test_admin_gets_no_work_data(self):
        c = self.as_(self.admin)
        self.assertEqual(c.get("/api/projects/").json(), [])
        self.assertEqual(c.get("/api/tasks/").json(), [])
        self.assertEqual(c.get("/api/customers/").status_code, 403)

    def test_manager_creates_customer_project_task(self):
        c = self.as_(self.m1)
        cid = c.post("/api/customers/", {"name": "NewCo"}).json()["id"]
        r = c.post("/api/projects/", {"name": "NP", "customer": cid, "members": [self.e2.id]})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["manager"], self.m1.id)
        pid = r.json()["id"]
        ok = c.post("/api/tasks/", {"project": pid, "title": "x", "assignee": self.e2.id})
        self.assertEqual(ok.status_code, 201)
        self.assertEqual(ok.json()["status"], "todo")
        # исполнитель не из проекта
        bad = c.post("/api/tasks/", {"project": pid, "title": "x", "assignee": self.e1.id})
        self.assertEqual(bad.status_code, 400)
        # чужой проект
        bad = c.post("/api/tasks/", {"project": self.p2.id, "title": "x"})
        self.assertEqual(bad.status_code, 400)

    def test_status_workflow(self):
        e, m = self.as_(self.e1), self.as_(self.m1)
        url = f"/api/tasks/{self.t1.id}/"
        self.assertEqual(e.patch(url, {"title": "hack"}).status_code, 403)
        self.assertEqual(e.patch(url, {"status": "done"}).status_code, 400)
        self.assertEqual(e.patch(url, {"status": "in_progress"}).json()["status"], "in_progress")
        self.assertEqual(e.patch(url, {"status": "review"}).json()["status"], "review")
        self.assertEqual(e.patch(url, {"status": "done"}).status_code, 403)
        self.assertEqual(m.patch(url, {"status": "in_progress", "return_reason": "Уточнить описание"}).json()["status"], "in_progress")
        e.patch(url, {"status": "review"})
        self.assertEqual(m.patch(url, {"status": "done"}).json()["status"], "done")

    def test_other_manager_cannot_edit(self):
        self.assertEqual(self.as_(self.m2).patch(f"/api/tasks/{self.t1.id}/", {"title": "x"}).status_code, 404)

    def test_full_workspace_persists_and_limits_access_by_role(self):
        employee, manager, other, admin = map(self.as_, [self.e1, self.m1, self.e2, self.admin])
        url = "/api/workspace/commands/"
        customer = {"action": "customer", "data": {"name": "Учебный заказчик", "phone": "100"}}
        self.assertEqual(employee.post(url, customer, format="json").status_code, 403)
        self.assertEqual(manager.post(url, customer, format="json").status_code, 204)
        self.assertTrue(any(c["name"] == "Учебный заказчик" for c in manager.get("/api/workspace/").json()["customers"]))
        department = {"action": "department", "data": {"name": "Продукт", "members": [self.e1.pk]}}
        self.assertEqual(admin.post(url, department, format="json").status_code, 204)
        self.assertEqual(admin.get("/api/workspace/").json()["departments"][0]["name"], "Продукт")
        archive = {"action": "project", "id": self.p1.pk, "data": {"is_archived": True}}
        self.assertEqual(manager.post(url, archive, format="json").status_code, 400)
        comment = {"action": "comment", "task": self.t1.pk, "data": {"text": "Готово к обсуждению"}}
        self.assertEqual(other.post(url, comment, format="json").status_code, 404)
        self.assertEqual(employee.post(url, comment, format="json").status_code, 204)
        task = next(t for t in manager.get("/api/workspace/").json()["tasks"] if t["id"] == self.t1.pk)
        self.assertEqual(task["comments"][0]["text"], "Готово к обсуждению")
        deletion = {"action": "delete-comment", "task": self.t1.pk, "id": task["comments"][0]["id"]}
        self.assertEqual(manager.post(url, deletion, format="json").status_code, 404)
        upload = SimpleUploadedFile("brief.txt", b"example", content_type="text/plain")
        files = f"/api/tasks/{self.t1.pk}/files/"
        self.assertEqual(employee.post(files, {"file": upload}, format="multipart").status_code, 201)
        file_id = manager.get(f"/api/tasks/{self.t1.pk}/").json()["attachments"][0]["id"]
        self.assertEqual(other.get(f"{files}{file_id}/").status_code, 404)
        self.assertEqual(b"".join(manager.get(f"{files}{file_id}/").streaming_content), b"example")
        self.assertEqual(manager.delete(f"{files}{file_id}/").status_code, 404)
        self.assertEqual(employee.delete(f"{files}{file_id}/").status_code, 204)
        notices = manager.get("/api/workspace/").json()["notifications"]
        notice = next(n for n in notices if n["title"] == "Новый комментарий")
        request = {"action": "notification", "id": notice["id"], "data": {"read": True}}
        self.assertEqual(other.post(url, request, format="json").status_code, 404)
        self.assertEqual(manager.post(url, request, format="json").status_code, 204)

    def test_browser_session_and_scoped_task_context(self):
        def signed_in(username):
            client = APIClient(enforce_csrf_checks=True)
            token = client.get("/api/auth/csrf/").json()["csrf_token"]
            response = client.post("/api/auth/login/", {"username": username, "password": "pw"},
                                   format="json", HTTP_X_CSRFTOKEN=token)
            self.assertEqual(response.status_code, 200)
            return client

        def write(client, verb, path, data):
            token = client.get("/api/auth/csrf/").json()["csrf_token"]
            return getattr(client, verb)(path, data, format="json", HTTP_X_CSRFTOKEN=token)

        manager, employee = signed_in("m1"), signed_in("e1")
        self.assertEqual(manager.get(f"/api/projects/{self.p1.id}/members/").json()[0]["id"], self.e1.id)
        created = write(manager, "post", "/api/tasks/", {"project": self.p1.id, "title": "Сценарий M2", "assignee": self.e1.id})
        self.assertEqual(created.status_code, 201)
        task_id = created.json()["id"]
        task_url = f"/api/tasks/{task_id}/"
        for client, state in [(employee, "in_progress"), (employee, "review"), (manager, "in_progress"),
                              (employee, "review"), (manager, "done")]:
            data = {"status": state}
            if client is manager and state == "in_progress":
                data["return_reason"] = "Уточнить описание"
            self.assertEqual(write(client, "patch", task_url, data).json()["status"], state)
        context_url = f"/api/projects/{self.p1.id}/task-context/"
        item = next(task for task in employee.get(context_url).json() if task["id"] == task_id)
        self.assertEqual(item["card_url"], f"/app/tasks/{task_id}")
        self.assertEqual(item["status"], "done")
        self.assertEqual(signed_in("e2").get(context_url).status_code, 404)
        workspace = employee.get("/api/workspace/").json()
        self.assertNotIn(self.t2.id, [task["id"] for task in workspace["tasks"]])
        updated = next(task for task in workspace["tasks"] if task["id"] == task_id)
        self.assertIsNotNone(updated["completed_at"])
        self.assertTrue(any("Уточнить описание" in event["text"] for event in updated["events"]))
