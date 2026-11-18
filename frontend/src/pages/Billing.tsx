import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, CreditCard, XCircle } from 'lucide-react';
import { useWorkspace } from '../state/workspace-context';
import { formatDate, offsetDate, requireCondition } from '../domain/model';
import {
  ActionLink,
  Button,
  CheckLine,
  NotFound,
  Notice,
  PageHeading,
  Panel,
  Screen,
} from '../components/ui';

export function Billing() {
  const { data, user, server } = useWorkspace();
  if (user?.role !== 'manager') return <NotFound forbidden />;
  return (
    <Screen>
      <PageHeading
        title="Тариф команды"
        description="Основная работа с задачами доступна в базовом тарифе."
      />
      <Notice>
        Демонстрация интерфейса подписки. PayPal Sandbox ещё не подключён. Настоящие платежи и
        списания не выполняются.
      </Notice>
      <div className="pricing-grid">
        <Panel title="Базовый">
          <div className="plan-price">Бесплатно</div>
          <p>Всё для планирования и контроля задач.</p>
          {[
            'Проекты и задачи',
            'Kanban и календарь',
            'Комментарии и файлы',
            'Контроль сроков и приёмка',
            'Основные отчёты',
          ].map((text) => (
            <CheckLine key={text}>{text}</CheckLine>
          ))}
          <span className="badge status-new">
            {data.subscription.plan === 'basic' ? 'Текущий демотариф' : 'Базовые функции включены'}
          </span>
        </Panel>
        <section className="pro-plan">
          <div className="pro-heading">
            <CreditCard size={25} />
            <span>Для команды</span>
          </div>
          <h2>Расширенная аналитика</h2>
          <div className="plan-price">
            $5 <span>/ 30 дней</span>
          </div>
          <p>Условная цена для демонстрационного сценария подписки.</p>
          {[
            'Будущие AI-сводки по проектам',
            'Будущий ML-прогноз сроков',
            'Расширенные представления аналитики',
          ].map((text) => (
            <CheckLine key={text}>{text}</CheckLine>
          ))}
          {data.subscription.plan === 'pro' ? (
            <Notice tone="success">
              Демотариф активирован до {formatDate(data.subscription.expiresAt ?? '')}.
            </Notice>
          ) : !server ? (
            <ActionLink to="/app/billing/checkout">Посмотреть тестовую оплату</ActionLink>
          ) : (
            <span className="badge status-new">Подключение оплаты запланировано</span>
          )}
          <small>AI и ML сейчас доступны как явно обозначенные демонстрации.</small>
        </section>
      </div>
    </Screen>
  );
}
export function Checkout() {
  const { user, transact, busy, server } = useWorkspace();
  const navigate = useNavigate();
  if (user?.role !== 'manager') return <NotFound forbidden />;
  if (server)
    return (
      <Screen>
        <PageHeading title="Тестовая оплата" back="/app/billing" />
        <Notice>Подключение PayPal Sandbox запланировано отдельно.</Notice>
      </Screen>
    );
  function result(status: string) {
    if (status === 'success')
      void transact((d, a) => {
        requireCondition(a.role === 'manager', 'Требуется роль руководителя.');
        return { ...d, subscription: { plan: 'pro', expiresAt: offsetDate(30) } };
      }, 'Демонстрационный тариф включён локально.').then((ok) => {
        if (ok) navigate('/app/billing/result?status=success');
      });
    else navigate(`/app/billing/result?status=${status}`);
  }
  return (
    <Screen>
      <PageHeading
        title="Подтверждение оплаты"
        description="Учебный сценарий для будущей интеграции PayPal Sandbox."
        back="/app/billing"
      />
      <div className="two-columns">
        <Panel title="Параметры подписки">
          <dl className="details">
            <div>
              <dt>Тариф</dt>
              <dd>Расширенная аналитика команды</dd>
            </div>
            <div>
              <dt>Период</dt>
              <dd>30 дней</dd>
            </div>
            <div>
              <dt>Условная сумма</dt>
              <dd>5 USD</dd>
            </div>
            <div>
              <dt>Режим</dt>
              <dd>Локальная демонстрация</dd>
            </div>
          </dl>
          <Notice tone="warning">
            Платёжный провайдер не вызывается. Кнопки показывают разные варианты ответа будущей
            интеграции.
          </Notice>
        </Panel>
        <Panel title="Выберите сценарий">
          <div className="checkout-actions">
            <Button disabled={busy} onClick={() => result('success')}>
              <CheckCircle2 size={19} />
              Смоделировать успешную оплату
            </Button>
            <Button variant="secondary" onClick={() => result('pending')}>
              <Clock3 size={19} />
              Смоделировать ожидание
            </Button>
            <Button variant="secondary" onClick={() => result('error')}>
              <XCircle size={19} />
              Смоделировать ошибку
            </Button>
            <Link className="text-link" to="/app/billing">
              Отменить и вернуться к тарифам
            </Link>
          </div>
        </Panel>
      </div>
    </Screen>
  );
}
export function PaymentResult() {
  const [params] = useSearchParams();
  const { user, data } = useWorkspace();
  if (user?.role !== 'manager') return <NotFound forbidden />;
  const status = params.get('status');
  const success = status === 'success';
  const pending = status === 'pending';
  const Icon = success ? CheckCircle2 : pending ? Clock3 : XCircle;
  return (
    <Screen>
      <PageHeading title="Результат тестовой оплаты" />
      <section
        className={`payment-result ${success ? 'payment-success' : pending ? 'payment-pending' : 'payment-error'}`}
      >
        <Icon size={44} strokeWidth={1.5} />
        <h2>
          {success
            ? 'Успешный сценарий'
            : pending
              ? 'Ожидание подтверждения'
              : 'Оплата не завершена'}
        </h2>
        <p>
          {success
            ? data.subscription.plan === 'pro'
              ? 'Демонстрационный тариф включён локально. Денежных списаний нет.'
              : 'Показан макет успешного результата. Для активации демотарифа пройдите тестовый сценарий.'
            : pending
              ? 'Будущий сервер будет ожидать подтверждение провайдера. В деморежиме статус сам не изменяется.'
              : 'Показан сценарий ошибки. Тариф не изменён; можно вернуться и повторить тест.'}
        </p>
        <div className="inline-actions">
          <ActionLink to="/app/billing" secondary>
            К тарифам
          </ActionLink>
          {!success && <ActionLink to="/app/billing/checkout">Повторить тест</ActionLink>}
        </div>
      </section>
    </Screen>
  );
}
