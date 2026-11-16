from rest_framework.test import APIClient, APITestCase

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
        self.assertEqual(m.patch(url, {"status": "in_progress"}).json()["status"], "in_progress")
        e.patch(url, {"status": "review"})
        self.assertEqual(m.patch(url, {"status": "done"}).json()["status"], "done")

    def test_other_manager_cannot_edit(self):
        self.assertEqual(self.as_(self.m2).patch(f"/api/tasks/{self.t1.id}/", {"title": "x"}).status_code, 404)
