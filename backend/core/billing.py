"""Тестовая оплата 30 дней расширенной аналитики через PayPal Sandbox (Orders API v2).

Поток:
1. POST /api/billing/orders/          — сервер создаёт заказ в PayPal, отдаёт ссылку на оплату.
2. Пользователь подтверждает платёж на стороне PayPal и возвращается на сайт.
3. POST /api/billing/orders/capture/  — сервер сам захватывает платёж и сверяет статус и сумму;
                                        только после этого активируется тариф.
   POST /api/billing/orders/cancel/   — пользователь отказался от оплаты.
Секреты PayPal живут только на сервере, frontend получает лишь ссылку на оплату.
"""
import uuid
from datetime import timedelta
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PaymentOrder, Subscription
from .permissions import IsManager


class PaymentUnavailable(APIException):
    status_code = 503
    default_detail = "Оплата временно недоступна. Попробуйте позже."
    default_code = "payment_unavailable"


def paypal(method, path, payload=None, request_id=None):
    """Единственная точка обращения к PayPal: возвращает (http_status, json)."""
    if not (settings.PAYPAL_CLIENT_ID and settings.PAYPAL_CLIENT_SECRET):
        raise PaymentUnavailable("PayPal Sandbox не настроен: задайте PAYPAL_CLIENT_ID и PAYPAL_CLIENT_SECRET.")
    base = settings.PAYPAL_API_BASE.rstrip("/")
    try:
        auth = requests.post(f"{base}/v1/oauth2/token", auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_CLIENT_SECRET),
                             data={"grant_type": "client_credentials"}, timeout=15)
        if auth.status_code != 200:
            raise PaymentUnavailable("PayPal не принял ключи Sandbox. Проверьте PAYPAL_CLIENT_ID и PAYPAL_CLIENT_SECRET.")
        headers = {"Authorization": f"Bearer {auth.json()['access_token']}", "Content-Type": "application/json"}
        if request_id:
            headers["PayPal-Request-Id"] = request_id
        response = requests.request(method, f"{base}{path}", headers=headers, json=payload, timeout=15)
    except requests.RequestException as error:
        raise PaymentUnavailable() from error
    try:
        data = response.json()
    except ValueError:
        data = {}
    return response.status_code, data


def active_until(user):
    subscription = Subscription.objects.filter(user=user).first()
    return subscription.expires_at if subscription and subscription.is_active else None


def activate(user):
    """Продлевает доступ на SUBSCRIPTION_DAYS; повторная оплата прибавляется к остатку."""
    now = timezone.now()
    subscription, _ = Subscription.objects.select_for_update().get_or_create(user=user, defaults={"expires_at": now})
    subscription.expires_at = max(subscription.expires_at, now) + timedelta(days=settings.SUBSCRIPTION_DAYS)
    subscription.save(update_fields=["expires_at"])
    return subscription.expires_at


def first_capture(data):
    try:
        return data["purchase_units"][0]["payments"]["captures"][0]
    except (KeyError, IndexError, TypeError):
        return None


def amount_matches(capture, order):
    try:
        return Decimal(capture["amount"]["value"]) == order.amount and capture["amount"]["currency_code"] == order.currency
    except (KeyError, TypeError, InvalidOperation):
        return False


class OrderRef(serializers.Serializer):
    order_id = serializers.CharField(max_length=64)


class BillingStatus(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        expires = active_until(request.user)
        last = PaymentOrder.objects.filter(user=request.user).order_by("-id").first()
        return Response({
            "plan": "pro" if expires else "basic",
            "expires_at": expires.isoformat() if expires else None,
            "configured": bool(settings.PAYPAL_CLIENT_ID and settings.PAYPAL_CLIENT_SECRET),
            "price": settings.SUBSCRIPTION_PRICE,
            "currency": settings.SUBSCRIPTION_CURRENCY,
            "days": settings.SUBSCRIPTION_DAYS,
            "last_order": {"status": last.status, "created_at": last.created_at.isoformat()} if last else None,
        })


class CreateOrder(APIView):
    permission_classes = [IsManager]

    def post(self, request):
        price, currency = settings.SUBSCRIPTION_PRICE, settings.SUBSCRIPTION_CURRENCY
        site = settings.TASKCONTROL_FRONTEND_URL
        status, data = paypal("POST", "/v2/checkout/orders", {
            "intent": "CAPTURE",
            "purchase_units": [{
                "custom_id": str(request.user.pk),
                "description": f"TaskControl: расширенная аналитика, {settings.SUBSCRIPTION_DAYS} дней",
                "amount": {"currency_code": currency, "value": price},
            }],
            "payment_source": {"paypal": {"experience_context": {
                "brand_name": "TaskControl",
                "user_action": "PAY_NOW",
                "return_url": f"{site}/app/billing/result",
                "cancel_url": f"{site}/app/billing/result?status=cancelled",
            }}},
        }, request_id=str(uuid.uuid4()))
        links = {link.get("rel"): link.get("href") for link in data.get("links", [])}
        approve = links.get("payer-action") or links.get("approve")
        if status not in (200, 201) or not data.get("id") or not approve:
            raise PaymentUnavailable("PayPal не создал заказ. Повторите попытку.")
        PaymentOrder.objects.create(user=request.user, provider_order_id=data["id"], amount=Decimal(price), currency=currency)
        return Response({"order_id": data["id"], "approve_url": approve}, status=201)


class CaptureOrder(APIView):
    permission_classes = [IsManager]

    @transaction.atomic
    def post(self, request):
        ref = OrderRef(data=request.data)
        ref.is_valid(raise_exception=True)
        order = get_object_or_404(PaymentOrder.objects.select_for_update(),
                                  provider_order_id=ref.validated_data["order_id"], user=request.user)
        if order.status == PaymentOrder.Status.COMPLETED:  # повторное открытие страницы результата
            return Response({"status": "completed", "expires_at": active_until(request.user)})
        if order.status != PaymentOrder.Status.CREATED:
            raise ValidationError({"detail": "Этот заказ уже закрыт. Начните оплату заново."})

        path = f"/v2/checkout/orders/{order.provider_order_id}"
        code, data = paypal("POST", f"{path}/capture", {}, request_id=f"capture-{order.pk}")
        if code == 422 and any(d.get("issue") == "ORDER_ALREADY_CAPTURED" for d in data.get("details", [])):
            code, data = paypal("GET", path)
        if code not in (200, 201):
            # Например, ORDER_NOT_APPROVED: платёж не подтверждён пользователем, заказ остаётся открытым.
            raise ValidationError({"detail": "PayPal не подтвердил платёж. Завершите оплату в PayPal и повторите."})

        capture = first_capture(data)
        if capture and capture.get("status") == "PENDING":
            return Response({"status": "pending", "expires_at": None})
        if data.get("status") == "COMPLETED" and capture and capture.get("status") == "COMPLETED" and amount_matches(capture, order):
            order.status, order.completed_at = PaymentOrder.Status.COMPLETED, timezone.now()
            order.save(update_fields=["status", "completed_at"])
            return Response({"status": "completed", "expires_at": activate(request.user)})
        order.status = PaymentOrder.Status.FAILED
        order.save(update_fields=["status"])
        return Response({"status": "failed", "expires_at": None})


class CancelOrder(APIView):
    permission_classes = [IsManager]

    @transaction.atomic
    def post(self, request):
        ref = OrderRef(data=request.data)
        ref.is_valid(raise_exception=True)
        order = get_object_or_404(PaymentOrder.objects.select_for_update(),
                                  provider_order_id=ref.validated_data["order_id"], user=request.user)
        if order.status == PaymentOrder.Status.CREATED:
            order.status = PaymentOrder.Status.CANCELLED
            order.save(update_fields=["status"])
        return Response({"status": order.status})
