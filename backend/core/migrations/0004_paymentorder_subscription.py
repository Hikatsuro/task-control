import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_department_workspacesettings_customer_email_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='PaymentOrder',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('provider_order_id', models.CharField(max_length=64, unique=True)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=8)),
                ('currency', models.CharField(max_length=3)),
                ('status', models.CharField(choices=[('created', 'Создан'), ('completed', 'Оплачен'), ('cancelled', 'Отменён'), ('failed', 'Не прошёл проверку')], default='created', max_length=16)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='payment_orders', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Subscription',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('expires_at', models.DateTimeField()),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='subscription', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
