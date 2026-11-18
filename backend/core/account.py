from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import password_validation
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import User


@method_decorator(csrf_protect, name="dispatch")
class ResetBase(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "reset"


class RequestReset(ResetBase):
    def post(self, request):
        email = serializers.EmailField().run_validation(request.data.get("email"))
        for user in User.objects.filter(email__iexact=email, is_active=True):
            if not user.has_usable_password():
                continue
            query = urlencode({"uid": urlsafe_base64_encode(force_bytes(user.pk)), "token": default_token_generator.make_token(user)})
            link = f"{settings.TASKCONTROL_FRONTEND_URL}/reset-password?{query}"
            send_mail("Восстановление доступа к TaskControl", f"Откройте ссылку для смены пароля:\n\n{link}",
                      settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
        return Response(status=204)


class ConfirmReset(ResetBase):
    @transaction.atomic
    def post(self, request):
        uid = serializers.CharField(max_length=64).run_validation(request.data.get("uid"))
        token = serializers.CharField(max_length=128).run_validation(request.data.get("token"))
        password = serializers.CharField(max_length=256, trim_whitespace=False).run_validation(request.data.get("password"))
        try:
            user = User.objects.select_for_update().filter(pk=int(urlsafe_base64_decode(uid)), is_active=True).first()
        except (ValueError, OverflowError):
            user = None
        if not user or not default_token_generator.check_token(user, token):
            raise ValidationError("Ссылка недействительна. Запросите новую ссылку для восстановления.")
        try:
            password_validation.validate_password(password, user=user)
        except DjangoValidationError as error:
            raise ValidationError({"password": error.messages}) from error
        user.set_password(password)
        user.save(update_fields=["password"])
        return Response(status=204)
