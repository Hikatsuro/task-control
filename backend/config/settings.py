import os
from pathlib import Path
from urllib.parse import urlsplit

BASE_DIR = Path(__file__).resolve().parent.parent


def load_env_file(path):
    """Reads KEY=value lines from backend/.env into the environment for a local run.
    Values already set in the environment win, so Docker Compose and the shell keep control.
    The file is ignored by Git: keys such as PAYPAL_CLIENT_SECRET live only there."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))


load_env_file(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-insecure-key")
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "rest_framework",
    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]
try:
    # In Docker, gunicorn has no static file server: WhiteNoise serves the admin's files.
    # A local run (runserver) does not need it, so the package stays optional there.
    import whitenoise  # noqa: F401

    MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")
except ImportError:
    pass

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

if os.environ.get("POSTGRES_DB"):
    DATABASES = {"default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ["POSTGRES_DB"],
        "USER": os.environ.get("POSTGRES_USER", "taskhub"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", ""),
        "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }}
else:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}

AUTH_USER_MODEL = "core.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
LANGUAGE_CODE = "ru"
TIME_ZONE = "Asia/Almaty"
USE_TZ = True
EMAIL_BACKEND = os.environ.get("DJANGO_EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
DEFAULT_FROM_EMAIL = os.environ.get("DJANGO_FROM_EMAIL", "taskcontrol@example.test")
# The address the site is opened at: links in emails, the PayPal return page, AI card links.
TASKCONTROL_FRONTEND_URL = os.environ.get("TASKCONTROL_FRONTEND_URL", "http://127.0.0.1:8080").rstrip("/")


def same_site_origins(url):
    """The site address plus its twin: 127.0.0.1 and localhost reach the same server,
    and a browser opened at either must be able to save."""
    parts = urlsplit(url)
    twins = {"127.0.0.1": "localhost", "localhost": "127.0.0.1"}
    origins = [f"{parts.scheme}://{parts.netloc}"]
    if parts.hostname in twins:
        port = f":{parts.port}" if parts.port else ""
        origins.append(f"{parts.scheme}://{twins[parts.hostname]}{port}")
    return origins


CSRF_TRUSTED_ORIGINS = same_site_origins(TASKCONTROL_FRONTEND_URL)
PASSWORD_RESET_TIMEOUT = 3600
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Тестовая оплата (PayPal Sandbox, Orders API v2) ---
# Ключи берутся только из окружения (или backend/.env) и никогда не попадают во frontend.
PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = os.environ.get("PAYPAL_CLIENT_SECRET", "")
PAYPAL_API_BASE = os.environ.get("PAYPAL_API_BASE", "https://api-m.sandbox.paypal.com")
SUBSCRIPTION_PRICE = os.environ.get("TASKCONTROL_PLAN_PRICE", "5.00")
SUBSCRIPTION_CURRENCY = os.environ.get("TASKCONTROL_PLAN_CURRENCY", "USD")
SUBSCRIPTION_DAYS = int(os.environ.get("TASKCONTROL_PLAN_DAYS", "30"))

# --- AI-помощник: локальная модель через Ollama (OpenAI-совместимый API) ---
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1").rstrip("/")
TASKCONTROL_AI_MODEL = os.environ.get("TASKCONTROL_AI_MODEL", "qwen2.5:3b")
TASKCONTROL_AI_TIMEOUT = int(os.environ.get("TASKCONTROL_AI_TIMEOUT", "120"))

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    # assistant: a local model answer takes seconds; this keeps one user from flooding it.
    "DEFAULT_THROTTLE_RATES": {"reset": "8/hour", "assistant": os.environ.get("TASKCONTROL_AI_RATE", "20/min")},
}
