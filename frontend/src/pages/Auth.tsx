import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { useWorkspace } from '../state/workspace-context';
import { roleLabels } from '../domain/model';
import { Avatar, Brand, Button, CheckLine, Field, Notice } from '../components/ui';
import { DjangoError, write } from '../data/django';

export function Auth({ mode = 'login' }: { mode?: 'login' | 'forgot' | 'reset' }) {
  const { data, signIn, user, notify, server, ready, busy } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const [selected, setSelected] = useState('u1');
  const [submitted, setSubmitted] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const resetParams = new URLSearchParams(location.search);
  async function reset(path: string, data: object) {
    setResetBusy(true);
    try {
      await write(path, 'POST', data);
      setSubmitted(true);
    } catch (error) {
      notify(
        error instanceof DjangoError ? error.message : 'Не удалось связаться с сервером.',
        'error',
      );
    } finally {
      setResetBusy(false);
    }
  }
  if (server && mode === 'login' && user)
    return <Navigate to={location.state?.from ?? '/app'} replace />;
  if (mode === 'login' && user && location.state?.from)
    return <Navigate to={location.state.from} replace />;
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Brand />
        <div>
          <h1>
            ОТ ПЛАНА
            <br />К РЕЗУЛЬТАТУ<span>.</span>
          </h1>
          <p>
            Проекты, задачи и сроки — в одном месте.
            <br />
            Каждый знает следующий шаг.
          </p>
        </div>
        <ol>
          {[
            ['Поставить задачу', 'Руководитель назначает исполнителя.'],
            ['Выполнить работу', 'Сотрудник передаёт результат на проверку.'],
            ['Принять результат', 'Руководитель подтверждает выполнение.'],
          ].map(([title, desc], i) => (
            <li key={title}>
              <span>0{i + 1}</span>
              <div>
                <strong>{title}</strong>
                <p>{desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link to="/" className="back-link">
          <ArrowLeft size={16} />
          На главную
        </Link>
      </aside>
      <main className="auth-form">
        <div className="auth-form-inner">
          <h2>
            {mode === 'login'
              ? 'ВОЙТИ В СИСТЕМУ'
              : mode === 'forgot'
                ? 'ВОССТАНОВИТЬ ДОСТУП'
                : 'НОВЫЙ ПАРОЛЬ'}
          </h2>
          {mode === 'login' && server ? (
            <>
              <p>Войди, чтобы открыть свои проекты и задачи.</p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const fields = new FormData(event.currentTarget);
                  void server.signIn(
                    String(fields.get('username')),
                    String(fields.get('password')),
                  );
                }}
              >
                <Field label="Логин" required>
                  <input name="username" autoComplete="username" required />
                </Field>
                <Field label="Пароль" required>
                  <input name="password" type="password" autoComplete="current-password" required />
                </Field>
                <Button type="submit" className="full-width" disabled={!ready || busy}>
                  {busy ? 'Входим…' : 'Войти в рабочее пространство'} <ArrowRight size={17} />
                </Button>
              </form>
              <div className="auth-links">
                <Link to="/forgot-password">Забыли пароль?</Link>
                <Link to="/">О системе</Link>
              </div>
            </>
          ) : mode === 'login' ? (
            <>
              <p>Открой рабочее пространство от лица участника команды.</p>
              <Notice>
                <ShieldCheck size={18} />
                <span>
                  Демонстрационный вход без пароля. Выбор профиля показывает разные роли; настоящую
                  авторизацию подключим с сервером.
                </span>
              </Notice>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  signIn(selected);
                  navigate('/app');
                }}
              >
                <fieldset className="profile-picker">
                  <legend>Выбери профиль</legend>
                  {data.users
                    .filter((u) => u.active)
                    .map((u) => (
                      <label
                        key={u.id}
                        className={selected === u.id ? 'profile-option selected' : 'profile-option'}
                      >
                        <input
                          type="radio"
                          name="profile"
                          value={u.id}
                          checked={selected === u.id}
                          onChange={() => setSelected(u.id)}
                        />
                        <Avatar name={u.name} />
                        <span>
                          <strong>{u.name}</strong>
                          <small>{roleLabels[u.role]}</small>
                        </span>
                      </label>
                    ))}
                </fieldset>
                <Button type="submit" className="full-width">
                  Войти в рабочее пространство <ArrowRight size={17} />
                </Button>
              </form>
              <div className="auth-links">
                <Link to="/forgot-password">Забыли пароль?</Link>
                <Link to="/">О системе</Link>
              </div>
            </>
          ) : mode === 'forgot' ? (
            <>
              <p>
                {server
                  ? 'Введи адрес, указанный в профиле.'
                  : 'Демонстрация восстановления доступа.'}
              </p>
              {submitted ? (
                <>
                  <Notice tone="success">
                    {server
                      ? 'Если адрес есть в системе, сервер подготовит ссылку для смены пароля.'
                      : 'Демонстрационный запрос обработан. Письмо не отправлено.'}
                  </Notice>
                  {!server && (
                    <Link to="/reset-password" className="button button-primary">
                      Продолжить демонстрацию
                    </Link>
                  )}
                </>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (server) {
                      void reset('/auth/request-reset/', {
                        email: new FormData(e.currentTarget).get('email'),
                      });
                      return;
                    }
                    setSubmitted(true);
                  }}
                >
                  <Field label="Электронная почта" required>
                    <input
                      type="email"
                      required
                      name="email"
                      placeholder="name@example.com"
                      autoComplete="email"
                    />
                  </Field>
                  <Button type="submit" disabled={resetBusy}>
                    {server ? 'Запросить ссылку' : 'Показать следующий шаг'}
                  </Button>
                </form>
              )}
              <Link to="/login" className="back-link">
                <ArrowLeft size={16} />
                Ко входу
              </Link>
            </>
          ) : (
            <>
              <p>
                {server
                  ? 'Задай новый пароль для учётной записи.'
                  : 'Демонстрация формы изменения пароля.'}
              </p>
              {server && (!resetParams.has('uid') || !resetParams.has('token')) ? (
                <Notice tone="warning">
                  Открой ссылку из письма или <Link to="/forgot-password">запроси новую</Link>.
                </Notice>
              ) : (
                !submitted && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = new FormData(e.currentTarget);
                      if (form.get('password') !== form.get('confirm')) {
                        notify('Пароли не совпадают.', 'error');
                        return;
                      }
                      if (server) {
                        void reset('/auth/confirm-reset/', {
                          uid: resetParams.get('uid'),
                          token: resetParams.get('token'),
                          password: form.get('password'),
                        });
                        return;
                      }
                      setSubmitted(true);
                    }}
                  >
                    <Field label="Новый пароль" required>
                      <input
                        type="password"
                        name="password"
                        minLength={8}
                        required
                        autoComplete="new-password"
                      />
                    </Field>
                    <Field label="Повторите пароль" required>
                      <input
                        type="password"
                        name="confirm"
                        minLength={8}
                        required
                        autoComplete="new-password"
                      />
                    </Field>
                    <Button type="submit" disabled={resetBusy}>
                      {server ? 'Сохранить новый пароль' : 'Проверить форму'}
                    </Button>
                  </form>
                )
              )}
              {submitted && (
                <Notice tone="success">
                  {server
                    ? 'Пароль обновлён. Можно войти с новым паролем.'
                    : 'Форма заполнена правильно. Пароль не сохранён.'}
                </Notice>
              )}
              <Link to="/login" className="back-link">
                <ArrowLeft size={16} />
                Ко входу
              </Link>
            </>
          )}
          <div className="auth-bottom">
            <CheckLine>Руководитель · Сотрудник · Администратор</CheckLine>
          </div>
        </div>
      </main>
    </div>
  );
}
