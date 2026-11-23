import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, CreditCard, XCircle } from 'lucide-react';
import { useWorkspace } from '../state/workspace-context';
import { DjangoError, request, write } from '../data/django';
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

type BillingInfo = {
  plan: 'basic' | 'pro';
  expires_at: string | null;
  configured: boolean;
  price: string;
  currency: string;
  days: number;
  last_order: { status: string; created_at: string } | null;
};

const basicFeatures = [
  'Проекты и задачи',
  'Kanban и календарь',
  'Комментарии и файлы',
  'Контроль сроков и приёмка',
  'Основные отчёты',
];
const proFeatures = [
  'Будущие AI-сводки по проектам',
  'Будущий ML-прогноз сроков',
  'Расширенные представления аналитики',
];

function messageOf(error: unknown) {
  return error instanceof DjangoError ? error.message : 'Не удалось связаться с сервером.';
}

export function Billing() {
  const { data, user, server } = useWorkspace();
  if (user?.role !== 'manager') return <NotFound forbidden />;
  if (server) return <ServerBilling />;
  return (
    <Screen>
      <PageHeading
        title="Тариф команды"
        description="Основная работа с задачами доступна в базовом тарифе."
      />
      <Notice>
        Демонстрация интерфейса подписки. PayPal Sandbox подключается при работе с сервером.
        Настоящие платежи и списания не выполняются.
      </Notice>
      <div className="pricing-grid">
        <Panel title="Базовый">
          <div className="plan-price">Бесплатно</div>
          <p>Всё для планирования и контроля задач.</p>
          {basicFeatures.map((text) => (
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
          {proFeatures.map((text) => (
            <CheckLine key={text}>{text}</CheckLine>
          ))}
          {data.subscription.plan === 'pro' ? (
            <Notice tone="success">
              Демотариф активирован до {formatDate(data.subscription.expiresAt ?? '')}.
            </Notice>
          ) : (
            <ActionLink to="/app/billing/checkout">Посмотреть тестовую оплату</ActionLink>
          )}
          <small>AI и ML сейчас доступны как явно обозначенные демонстрации.</small>
        </section>
      </div>
    </Screen>
  );
}

/** Режим Django: состояние тарифа и оплата идут через сервер и PayPal Sandbox. */
function ServerBilling() {
  const { notify } = useWorkspace();
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    request<BillingInfo>('/billing/', controller.signal)
      .then(setInfo)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(messageOf(error));
      });
    return () => controller.abort();
  }, []);
  async function pay() {
    setPaying(true);
    try {
      const order = await write<{ approve_url: string }>('/billing/orders/', 'POST');
      window.location.assign(order.approve_url);
    } catch (error) {
      notify(messageOf(error), 'error');
      setPaying(false);
    }
  }
  const pro = info?.plan === 'pro';
  return (
    <Screen>
      <PageHeading
        title="Тариф команды"
        description="Основная работа с задачами доступна в базовом тарифе."
      />
      <Notice>
        Оплата проходит через PayPal Sandbox: это тестовый режим, реальные деньги не списываются.
        Тариф включается только после того, как сервер проверит платёж.
      </Notice>
      {loadError && <Notice tone="warning">{loadError}</Notice>}
      {info && !info.configured && (
        <Notice tone="warning">
          PayPal Sandbox не настроен: задайте PAYPAL_CLIENT_ID и PAYPAL_CLIENT_SECRET на сервере.
        </Notice>
      )}
      <div className="pricing-grid">
        <Panel title="Базовый">
          <div className="plan-price">Бесплатно</div>
          <p>Всё для планирования и контроля задач.</p>
          {basicFeatures.map((text) => (
            <CheckLine key={text}>{text}</CheckLine>
          ))}
          <span className="badge status-new">Базовые функции включены</span>
        </Panel>
        <section className="pro-plan">
          <div className="pro-heading">
            <CreditCard size={25} />
            <span>Для команды</span>
          </div>
          <h2>Расширенная аналитика</h2>
          <div className="plan-price">
            {info ? `${info.price} ${info.currency}` : '…'} <span>/ {info?.days ?? 30} дней</span>
          </div>
          <p>Тестовая подписка для учебного проекта.</p>
          {proFeatures.map((text) => (
            <CheckLine key={text}>{text}</CheckLine>
          ))}
          {pro && (
            <Notice tone="success">
              Тариф активен до {formatDate(info?.expires_at ?? '', { day: 'numeric', month: 'long' })}.
              Повторная оплата продлит его ещё на {info?.days} дней.
            </Notice>
          )}
          {info?.last_order?.status === 'failed' && (
            <Notice tone="warning">Последний платёж не прошёл проверку. Тариф не изменён.</Notice>
          )}
          <Button disabled={paying || !info?.configured} onClick={() => void pay()}>
            {paying ? 'Переходим в PayPal…' : pro ? 'Продлить через PayPal' : 'Оплатить через PayPal'}
          </Button>
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
        <Notice>
          Оплата начинается на странице тарифов: кнопка «Оплатить через PayPal» открывает PayPal
          Sandbox.
        </Notice>
        <ActionLink to="/app/billing">К тарифам</ActionLink>
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
            Платёжный провайдер не вызывается. Кнопки показывают разные варианты ответа
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
  const { user, data, server } = useWorkspace();
  if (user?.role !== 'manager') return <NotFound forbidden />;
  if (server) return <ServerPaymentResult />;
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
              ? 'Сервер ожидает подтверждение провайдера. В деморежиме статус сам не изменяется.'
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

type Outcome = {
  kind: 'loading' | 'success' | 'pending' | 'failed' | 'cancelled' | 'error';
  text: string;
};

/** PayPal возвращает пользователя сюда с ?token=<id заказа>; результат подтверждает сервер. */
function ServerPaymentResult() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const cancelled = params.get('status') === 'cancelled';
  const [outcome, setOutcome] = useState<Outcome>(() =>
    token
      ? { kind: 'loading', text: 'Проверяем платёж на сервере…' }
      : { kind: 'error', text: 'Не найден номер заказа PayPal. Начните оплату заново.' },
  );
  const started = useRef(false);
  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    const action = cancelled ? 'cancel' : 'capture';
    write<{ status: string }>(`/billing/orders/${action}/`, 'POST', { order_id: token })
      .then(({ status }) => {
        if (status === 'completed')
          setOutcome({
            kind: 'success',
            text: 'Платёж подтверждён сервером, расширенная аналитика включена. Это тестовая оплата: деньги не списаны.',
          });
        else if (status === 'pending')
          setOutcome({
            kind: 'pending',
            text: 'PayPal ещё обрабатывает платёж. Тариф включится после подтверждения; обновите страницу позже.',
          });
        else if (status === 'cancelled')
          setOutcome({ kind: 'cancelled', text: 'Оплата отменена. Тариф не изменён.' });
        else
          setOutcome({
            kind: 'failed',
            text: 'Платёж не прошёл проверку на сервере. Тариф не изменён.',
          });
      })
      .catch((error: unknown) => setOutcome({ kind: 'error', text: messageOf(error) }));
  }, [token, cancelled]);
  const Icon =
    outcome.kind === 'success'
      ? CheckCircle2
      : outcome.kind === 'pending' || outcome.kind === 'loading'
        ? Clock3
        : XCircle;
  const titles: Record<Outcome['kind'], string> = {
    loading: 'Проверяем платёж',
    success: 'Оплата прошла успешно',
    pending: 'Ожидание подтверждения',
    failed: 'Платёж не подтверждён',
    cancelled: 'Оплата отменена',
    error: 'Не удалось завершить оплату',
  };
  const tone =
    outcome.kind === 'success'
      ? 'payment-success'
      : outcome.kind === 'pending' || outcome.kind === 'loading'
        ? 'payment-pending'
        : 'payment-error';
  return (
    <Screen>
      <PageHeading title="Результат тестовой оплаты" />
      <section className={`payment-result ${tone}`} aria-live="polite">
        <Icon size={44} strokeWidth={1.5} />
        <h2>{titles[outcome.kind]}</h2>
        <p>{outcome.text}</p>
        <div className="inline-actions">
          <ActionLink to="/app/billing" secondary>
            К тарифам
          </ActionLink>
        </div>
      </section>
    </Screen>
  );
}
