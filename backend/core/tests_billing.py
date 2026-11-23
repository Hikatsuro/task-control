from unittest.mock import patch

from rest_framework.test import APIClient, APITestCase

from .models import PaymentOrder, Role, User

CREATED = (201, {"id": "ORDER-1", "links": [{"rel": "payer-action", "href": "https://sandbox.paypal.test/approve"}]})


def captured(value="5.00", currency="USD", state="COMPLETED"):
    return (201, {"status": state, "purchase_units": [{"payments": {"captures": [
        {"status": state, "amount": {"currency_code": currency, "value": value}}]}}]})


class BillingTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.manager = User.objects.create_user("m1", password="pw", role=Role.MANAGER)
        cls.other = User.objects.create_user("m2", password="pw", role=Role.MANAGER)
        cls.employee = User.objects.create_user("e1", password="pw", role=Role.EMPLOYEE)

    def as_(self, user):
        client = APIClient()
        client.force_login(user)
        return client

    def start(self, client):
        with patch("core.billing.paypal", return_value=CREATED):
            return client.post("/api/billing/orders/")

    def test_only_manager_can_pay(self):
        self.assertEqual(self.as_(self.employee).post("/api/billing/orders/").status_code, 403)
        self.assertEqual(self.as_(self.employee).get("/api/billing/").status_code, 403)

    def test_successful_payment_activates_plan_once(self):
        client = self.as_(self.manager)
        created = self.start(client)
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["approve_url"], "https://sandbox.paypal.test/approve")
        self.assertEqual(client.get("/api/billing/").json()["plan"], "basic")  # до подтверждения тариф не открыт

        with patch("core.billing.paypal", return_value=captured()) as call:
            first = client.post("/api/billing/orders/capture/", {"order_id": "ORDER-1"}, format="json")
            self.assertEqual(first.json()["status"], "completed")
            again = client.post("/api/billing/orders/capture/", {"order_id": "ORDER-1"}, format="json")
            self.assertEqual(call.call_count, 1)  # повтор не обращается к PayPal и не продлевает тариф
        self.assertEqual(again.json()["expires_at"], first.json()["expires_at"])
        state = client.get("/api/billing/").json()
        self.assertEqual(state["plan"], "pro")
        self.assertEqual(state["last_order"]["status"], "completed")

    def test_cancelled_payment_keeps_basic_plan(self):
        client = self.as_(self.manager)
        self.start(client)
        cancelled = client.post("/api/billing/orders/cancel/", {"order_id": "ORDER-1"}, format="json")
        self.assertEqual(cancelled.json()["status"], "cancelled")
        self.assertEqual(client.get("/api/billing/").json()["plan"], "basic")
        with patch("core.billing.paypal") as call:
            late = client.post("/api/billing/orders/capture/", {"order_id": "ORDER-1"}, format="json")
            call.assert_not_called()
        self.assertEqual(late.status_code, 400)

    def test_wrong_amount_is_rejected(self):
        client = self.as_(self.manager)
        self.start(client)
        with patch("core.billing.paypal", return_value=captured(value="1.00")):
            result = client.post("/api/billing/orders/capture/", {"order_id": "ORDER-1"}, format="json")
        self.assertEqual(result.json()["status"], "failed")
        self.assertEqual(client.get("/api/billing/").json()["plan"], "basic")
        self.assertEqual(PaymentOrder.objects.get().status, "failed")

    def test_pending_capture_does_not_activate(self):
        client = self.as_(self.manager)
        self.start(client)
        with patch("core.billing.paypal", return_value=captured(state="PENDING")):
            result = client.post("/api/billing/orders/capture/", {"order_id": "ORDER-1"}, format="json")
        self.assertEqual(result.json()["status"], "pending")
        self.assertEqual(client.get("/api/billing/").json()["plan"], "basic")
        self.assertEqual(PaymentOrder.objects.get().status, "created")

    def test_unapproved_order_stays_open(self):
        client = self.as_(self.manager)
        self.start(client)
        with patch("core.billing.paypal", return_value=(422, {"details": [{"issue": "ORDER_NOT_APPROVED"}]})):
            result = client.post("/api/billing/orders/capture/", {"order_id": "ORDER-1"}, format="json")
        self.assertEqual(result.status_code, 400)
        self.assertEqual(PaymentOrder.objects.get().status, "created")

    def test_order_belongs_to_its_payer(self):
        self.start(self.as_(self.manager))
        stranger = self.as_(self.other)
        self.assertEqual(stranger.post("/api/billing/orders/capture/", {"order_id": "ORDER-1"}, format="json").status_code, 404)
        self.assertEqual(stranger.post("/api/billing/orders/cancel/", {"order_id": "ORDER-1"}, format="json").status_code, 404)

    def test_missing_credentials_return_clear_error(self):
        with self.settings(PAYPAL_CLIENT_ID="", PAYPAL_CLIENT_SECRET=""):
            response = self.as_(self.manager).post("/api/billing/orders/")
        self.assertEqual(response.status_code, 503)
        self.assertIn("PAYPAL_CLIENT_ID", response.json()["detail"])
