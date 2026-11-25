#!/bin/sh
set -e

python manage.py migrate --noinput
python manage.py collectstatic --noinput

if [ "${TASKCONTROL_SEED_DEMO:-0}" = "1" ]; then
  # Заполнение идемпотентно: get_or_create, существующие записи не затираются.
  python manage.py shell -c "import seed_full_demo"
fi

# --timeout: an AI summary from a local model can take up to two minutes.
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 180 --access-logfile -
