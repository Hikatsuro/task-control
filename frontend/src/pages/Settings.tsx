import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Check, KeyRound, Moon, RotateCcw, Settings2, Sun, UserRound } from 'lucide-react';
import { persist, useWorkspace } from '../state/workspace-context';
import { setTheme, useTheme } from '../state/theme';
import { formatDate, requireCondition, roleLabels } from '../domain/model';
import {
  ActionLink,
  Avatar,
  Button,
  Confirm,
  Empty,
  Field,
  Notice,
  PageHeading,
  Panel,
  Screen,
  Tabs,
} from '../components/ui';

export function Notifications() {
  const { data, user, transact, server } = useWorkspace();
  const [tab, setTab] = useState('all');
  if (!user) return null;
  const notifications = data.notifications.filter(
    (n) => n.userId === user.id && (tab === 'all' || (tab === 'unread' ? !n.read : n.read)),
  );
  return (
    <Screen>
      <PageHeading
        title="Уведомления"
        description="Назначения, обсуждения и результаты проверки."
        action={
          <Button
            variant="secondary"
            onClick={() =>
              void persist(
                { server, transact },
                { action: 'notifications', data: { read: true } },
                (d, a) => ({
                  ...d,
                  notifications: d.notifications.map((n) =>
                    n.userId === a.id ? { ...n, read: true } : n,
                  ),
                }),
                'Уведомления отмечены прочитанными.',
              )
            }
          >
            <Check size={16} />
            Прочитать все
          </Button>
        }
      />
      <Tabs
        options={[
          { value: 'all', label: 'Все' },
          { value: 'unread', label: 'Непрочитанные' },
          { value: 'read', label: 'Прочитанные' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {notifications.length ? (
        <div className="notification-list">
          {notifications.map((n) => (
            <article key={n.id} className={n.read ? '' : 'notification-unread'}>
              <span className="notification-symbol">
                <Bell size={19} />
              </span>
              <div>
                <h2>{n.title}</h2>
                <p>{n.body}</p>
                <time>
                  {formatDate(n.createdAt, {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
              <div className="notification-actions">
                {n.taskId && (
                  <Link
                    to={`/app/tasks/${n.taskId}`}
                    className="text-link"
                    onClick={() =>
                      void persist(
                        { server, transact },
                        { action: 'notification', id: n.id, data: { read: true } },
                        (d, a) => ({
                          ...d,
                          notifications: d.notifications.map((x) =>
                            x.id === n.id && x.userId === a.id ? { ...x, read: true } : x,
                          ),
                        }),
                      )
                    }
                  >
                    Открыть задачу
                  </Link>
                )}
                <Button
                  variant="ghost"
                  onClick={() =>
                    void persist(
                      { server, transact },
                      { action: 'notification', id: n.id, data: { read: !n.read } },
                      (d, a) => ({
                        ...d,
                        notifications: d.notifications.map((x) =>
                          x.id === n.id && x.userId === a.id ? { ...x, read: !x.read } : x,
                        ),
                      }),
                    )
                  }
                >
                  {n.read ? 'В непрочитанные' : 'Прочитано'}
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Уведомлений пока нет"
          description="Здесь появятся сообщения о доступных вам задачах."
        />
      )}
    </Screen>
  );
}
export function Profile() {
  const { data, user, transact, busy, server, signOut } = useWorkspace();
  if (!user) return null;
  return (
    <Screen>
      <PageHeading title="Личный профиль" description="Сведения, которые видит команда." />
      <div className="form-layout">
        <Panel title="Информация о себе">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void persist(
                { server, transact },
                {
                  action: 'profile',
                  data: {
                    name: String(f.get('name')),
                    email: String(f.get('email')),
                    position: String(f.get('position')),
                  },
                },
                (d, a) => {
                  const name = String(f.get('name')).trim();
                  requireCondition(name.length >= 2, 'Имя должно содержать минимум 2 символа.');
                  return {
                    ...d,
                    users: d.users.map((u) =>
                      u.id === a.id
                        ? {
                            ...u,
                            name,
                            email: String(f.get('email')),
                            position: String(f.get('position')),
                          }
                        : u,
                    ),
                  };
                },
                'Профиль обновлён.',
              );
            }}
          >
            <div className="profile-hero">
              <Avatar name={user.name} />
              <div>
                <strong>{user.name}</strong>
                <span>{roleLabels[user.role]}</span>
              </div>
            </div>
            <Field label="Отображаемое имя" required>
              <input name="name" required minLength={2} maxLength={80} defaultValue={user.name} />
            </Field>
            <Field label="Электронная почта" required>
              <input name="email" type="email" required defaultValue={user.email} />
            </Field>
            <Field label="Направление работы">
              <input name="position" maxLength={120} defaultValue={user.position} />
            </Field>
            <div className="form-grid">
              <Field label="Логин">
                <input readOnly value={user.username} />
              </Field>
              <Field label="Отдел">
                <input
                  readOnly
                  value={
                    data.departments.find((d) => d.id === user.departmentId)?.name ?? 'Не указан'
                  }
                />
              </Field>
            </div>
            <Button type="submit" disabled={busy}>
              Сохранить профиль
            </Button>
          </form>
        </Panel>
        <Panel title="Настройки профиля">
          <div className="settings-link-list">
            <Link to="/app/profile/security">
              <KeyRound size={19} />
              Пароль и безопасность
            </Link>
            <Link to="/app/settings/notifications">
              <Bell size={19} />
              Настройки уведомлений
            </Link>
            {server ? (
              <Button variant="secondary" disabled={busy} onClick={signOut}>
                <UserRound size={19} />
                Выйти из аккаунта
              </Button>
            ) : (
              <Link to="/login">
                <UserRound size={19} />
                Выбрать другой демопрофиль
              </Link>
            )}
          </div>
        </Panel>
      </div>
    </Screen>
  );
}
export function Security() {
  const { notify, server, busy } = useWorkspace();
  const [checked, setChecked] = useState(false);
  return (
    <Screen>
      <PageHeading
        title="Пароль и безопасность"
        back="/app/profile"
        description="Управляйте паролем своей учётной записи."
      />
      <div className="form-single">
        <Panel title="Изменение пароля">
          {!server && (
            <Notice>
              Сейчас используется выбор демонстрационного профиля без пароля. Здесь можно проверить
              заполнение формы; изменение пароля не выполняется.
            </Notice>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (f.get('password') !== f.get('confirm')) {
                notify('Новые пароли не совпадают.', 'error');
                return;
              }
              if (server) {
                const form = e.currentTarget;
                void server
                  .command(
                    {
                      action: 'password',
                      data: {
                        current: String(f.get('current')),
                        password: String(f.get('password')),
                      },
                    },
                    'Пароль изменён.',
                  )
                  .then((ok) => {
                    if (ok) form.reset();
                  });
                return;
              }
              setChecked(true);
              e.currentTarget.reset();
            }}
          >
            <Field label="Текущий пароль">
              <input name="current" type="password" autoComplete="current-password" required />
            </Field>
            <Field label="Новый пароль" hint="Не меньше 8 символов">
              <input
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </Field>
            <Field label="Повторите новый пароль">
              <input
                name="confirm"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </Field>
            <Button type="submit" disabled={busy}>
              {server ? 'Изменить пароль' : 'Проверить заполнение'}
            </Button>
          </form>
          {checked && (
            <Notice tone="success">
              Форма заполнена правильно. Введённые пароли не сохранены.
            </Notice>
          )}
        </Panel>
      </div>
    </Screen>
  );
}
export function Settings({ notificationsOnly = false }: { notificationsOnly?: boolean }) {
  const { data, user, transact, busy, resetDemo, server } = useWorkspace();
  const theme = useTheme();
  const [themeSaveFailed, setThemeSaveFailed] = useState(false);
  const [reset, setReset] = useState(false);
  const navigate = useNavigate();
  if (!user) return null;
  const preferences = [
    ['assignment', 'Назначение задач', 'Новые задачи и смена исполнителя'],
    ['changes', 'Изменения задачи', 'Описание, сроки и приоритеты'],
    ['deadline', 'Сроки выполнения', 'Приближение срока и просрочки'],
    ['comments', 'Комментарии', 'Новые сообщения в обсуждении'],
    ['review', 'Проверка результата', 'Приёмка и возврат на доработку'],
  ];
  return (
    <Screen>
      <PageHeading
        title={notificationsOnly ? 'Настройки уведомлений' : 'Настройки'}
        description="Рабочее пространство и личные предпочтения."
      />
      <div className="settings-layout">
        {!notificationsOnly && (
          <Panel title="Внешний вид">
            <fieldset className="theme-picker">
              <legend className="sr-only">Цветовая тема</legend>
              {(
                [
                  ['light', 'Светлая', 'Молочный фон и оранжевые акценты', Sun],
                  ['dark', 'Тёмная', 'Тёмная олива и мягкая терракота', Moon],
                ] as const
              ).map(([value, label, description, Icon]) => (
                <label key={value} className={`theme-choice theme-choice-${value}`}>
                  <input
                    type="radio"
                    name="theme"
                    value={value}
                    checked={theme === value}
                    onChange={() => setThemeSaveFailed(!setTheme(value))}
                  />
                  <span className="theme-choice-content">
                    <span className="theme-preview" aria-hidden="true">
                      <span className="theme-preview-sidebar" />
                      <span className="theme-preview-body">
                        <span className="theme-preview-heading" />
                        <span className="theme-preview-card" />
                        <span className="theme-preview-action" />
                      </span>
                    </span>
                    <span className="theme-choice-title">
                      <Icon size={18} />
                      <strong>{label}</strong>
                    </span>
                    <small>{description}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            <p className="muted" role="status">
              {themeSaveFailed
                ? 'Тема применена, но браузер не разрешил её сохранить. После перезапуска выберите её снова.'
                : 'Выбор сохраняется автоматически в этом браузере, включая главную страницу и вход.'}
            </p>
          </Panel>
        )}
        {!notificationsOnly && (
          <Panel title="Рабочая группа">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void persist(
                  { server, transact },
                  {
                    action: 'settings',
                    data: {
                      name: String(f.get('name')),
                      description: String(f.get('description')),
                    },
                  },
                  (d, a) => {
                    requireCondition(a.role === 'admin', 'Настройки команды меняет администратор.');
                    const name = String(f.get('name')).trim();
                    requireCondition(name.length >= 2, 'Укажите название команды.');
                    return {
                      ...d,
                      settings: { ...d.settings, name, description: String(f.get('description')) },
                    };
                  },
                  'Настройки команды сохранены.',
                );
              }}
            >
              <Field label="Название команды">
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  defaultValue={data.settings.name}
                  readOnly={user.role !== 'admin'}
                />
              </Field>
              <Field label="Описание">
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={data.settings.description}
                  readOnly={user.role !== 'admin'}
                />
              </Field>
              {user.role === 'admin' ? (
                <Button type="submit" disabled={busy}>
                  Сохранить настройки
                </Button>
              ) : (
                <p className="muted">Настройки команды изменяет администратор.</p>
              )}
            </form>
          </Panel>
        )}
        <Panel title="Уведомления внутри системы">
          <p className="muted">
            Предпочтения сохраняются для текущего профиля. Напоминания о сроках рассчитываются при
            открытии приложения.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void persist(
                { server, transact },
                {
                  action: 'preferences',
                  data: Object.fromEntries(preferences.map(([key]) => [key, f.get(key) === 'on'])),
                },
                (d, a) => ({
                  ...d,
                  settings: {
                    ...d.settings,
                    notifications: {
                      ...d.settings.notifications,
                      ...Object.fromEntries(
                        preferences.map(([key]) => [`${a.id}:${key}`, f.get(key) === 'on']),
                      ),
                    },
                  },
                }),
                'Предпочтения сохранены.',
              );
            }}
          >
            <div className="switch-list">
              {preferences.map(([key, label, hint]) => (
                <label key={key}>
                  <span>
                    <strong>{label}</strong>
                    <small>{hint}</small>
                  </span>
                  <input
                    className="switch"
                    type="checkbox"
                    name={key}
                    defaultChecked={data.settings.notifications[`${user.id}:${key}`] ?? true}
                  />
                </label>
              ))}
            </div>
            <Button type="submit" disabled={busy}>
              Сохранить предпочтения
            </Button>
          </form>
        </Panel>
        {!notificationsOnly && (
          <>
            <Panel title="Движение интерфейса">
              <label className="switch-line">
                <span>
                  <strong>Уменьшить анимацию</strong>
                  <small>Короткие переходы заменяются мгновенными изменениями.</small>
                </span>
                <input
                  className="switch"
                  type="checkbox"
                  checked={data.settings.notifications[`${user.id}:reducedMotion`] ?? false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    void persist(
                      { server, transact },
                      { action: 'preferences', data: { reducedMotion: checked } },
                      (d, a) => ({
                        ...d,
                        settings: {
                          ...d.settings,
                          notifications: {
                            ...d.settings.notifications,
                            [`${a.id}:reducedMotion`]: checked,
                          },
                        },
                      }),
                    );
                  }}
                />
              </label>
              <p className="muted">Системная настройка уменьшения движения тоже учитывается.</p>
            </Panel>
            {!server && (
              <Panel title="Демонстрационные данные">
                <p>
                  Все изменения хранятся локально. Сброс возвращает исходные проекты, задачи и
                  профили в этом браузере.
                </p>
                {user.role === 'admin' ? (
                  <Button variant="secondary" onClick={() => setReset(true)}>
                    <RotateCcw size={17} />
                    Восстановить исходный набор
                  </Button>
                ) : (
                  <Notice>
                    <Settings2 size={18} />
                    Сброс доступен через профиль администратора.
                  </Notice>
                )}
                <ActionLink to="/app/help/screens" secondary>
                  Посмотреть карту экранов
                </ActionLink>
              </Panel>
            )}
          </>
        )}
        <Confirm
          open={reset}
          onClose={() => setReset(false)}
          title="Сбросить демоверсию?"
          description="Локальные изменения проектов, задач и профилей будут заменены исходным набором. Локальные вложения также будут удалены."
          danger
          actionLabel="Сбросить данные"
          onConfirm={() => {
            void resetDemo().then(() => navigate('/login'));
          }}
        />
      </div>
    </Screen>
  );
}
