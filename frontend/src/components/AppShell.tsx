import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, HelpCircle, LogOut, Menu, RefreshCcw, Settings, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useWorkspace } from '../state/workspace-context';
import { STORAGE_KEY } from '../data/repository';
import { formatDate, roleLabels } from '../domain/model';
import { Avatar, Brand, Button, Notice } from './ui';
import { CommandMenu } from './CommandMenu';
import { NotificationsPopover } from './NotificationsPopover';

const businessNav = [
  ['overview', '/app', 'Обзор'],
  ['projects', '/app/projects', 'Проекты'],
  ['tasks', '/app/tasks', 'Задачи'],
  ['calendar', '/app/calendar', 'Календарь'],
  ['clients', '/app/clients', 'Заказчики'],
  ['team', '/app/team', 'Команда'],
  ['reports', '/app/reports', 'Отчёты'],
  ['assistant', '/app/assistant', 'AI-помощник'],
  ['forecast', '/app/forecast', 'Прогноз сроков'],
  ['billing', '/app/billing', 'Тариф'],
] as const;
// Modules that are demonstrations, not working features, sit in their own labelled group so
// nobody mistakes them for the core of the system. With Django the AI assistant (local model)
// and the plan (PayPal Sandbox) work for real; only the ML forecast is still a demonstration.
const demoModulesOf = (server: boolean) =>
  server ? ['forecast'] : ['assistant', 'forecast', 'billing'];
export function AppShell() {
  const { data, user, ready, signOut, server, busy } = useWorkspace();
  const demoModules = demoModulesOf(Boolean(server));
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    document.getElementById('main-content')?.focus();
  }, [location.pathname]);
  if (!ready)
    return (
      <div className="loading-screen" aria-busy="true">
        <Brand />
        <span>Открываем рабочее пространство…</span>
      </div>
    );
  if (!user)
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  const items =
    user.role === 'admin'
      ? [
          ['overview', '/app', 'Обзор'],
          ['team', '/app/users', 'Пользователи'],
          ['projects', '/app/departments', 'Отделы и группы'],
        ]
      : businessNav.filter(
          ([icon]) =>
            !(user.role === 'employee' && ['clients', 'reports', 'billing'].includes(icon)),
        );
  // Section name for the header; pages outside the menu still get a real name.
  const sections = [
    ...items,
    ['', '/app/board', 'Задачи'],
    ['', '/app/notifications', 'Уведомления'],
    ['', '/app/profile', 'Профиль'],
    ['', '/app/settings', 'Настройки'],
    ['', '/app/help', 'Помощь'],
    ['', '/app/archive', 'Проекты'],
  ];
  const title =
    sections.find(([, path]) =>
      path === '/app' ? location.pathname === path : location.pathname.startsWith(path),
    )?.[2] ?? 'Рабочее пространство';
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Перейти к содержимому
      </a>
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Закрыть меню"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div>
            <Brand />
            <span className="workspace-name">{data.settings.name}</span>
          </div>
          <Button
            variant="ghost"
            className="mobile-only"
            aria-label="Закрыть меню"
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} />
          </Button>
        </div>
        <nav aria-label="Основная навигация" className="sidebar-nav">
          {items
            .filter(([icon]) => !demoModules.includes(icon))
            .map(([icon, path, label]) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/app'}
                onClick={() => setMenuOpen(false)}
              >
                <img src={`/icons/${icon}.svg`} alt="" width="20" height="20" />
                <span>{label}</span>
              </NavLink>
            ))}
          {items.some(([icon]) => demoModules.includes(icon)) && (
            <>
              <span className="nav-group" id="demo-modules">
                Демо-модули
              </span>
              {items
                .filter(([icon]) => demoModules.includes(icon))
                .map(([icon, path, label]) => (
                  <NavLink
                    key={path}
                    to={path}
                    className="nav-demo"
                    aria-describedby="demo-modules"
                    onClick={() => setMenuOpen(false)}
                  >
                    <img src={`/icons/${icon}.svg`} alt="" width="20" height="20" />
                    <span>{label}</span>
                  </NavLink>
                ))}
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/app/profile" className="sidebar-profile" onClick={() => setMenuOpen(false)}>
            <Avatar name={user.name} />
            <div>
              <strong>{user.name}</strong>
              <span>{roleLabels[user.role]}</span>
            </div>
            <ChevronDown size={14} />
          </Link>
          <div className="sidebar-bottom-links">
            <Link to="/app/settings" onClick={() => setMenuOpen(false)}>
              <Settings size={15} />
              Настройки
            </Link>
            <Link to="/app/help" onClick={() => setMenuOpen(false)}>
              <HelpCircle size={15} />
              Помощь
            </Link>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="app-header">
          <Button
            variant="ghost"
            className="mobile-only"
            onClick={() => setMenuOpen(true)}
            aria-label="Открыть меню"
          >
            <Menu size={21} />
          </Button>
          <span className="breadcrumb">{title}</span>
          <div className="header-actions">
            <CommandMenu />
            {/* Where the data comes from lives here instead of a second bar under the header. */}
            {server ? (
              <span className="demo-pill">
                <span className="demo-dot" />
                <span className="demo-pill-text">Данные из Django</span>
                <span className="demo-pill-short">Django</span>
                <button type="button" onClick={() => void server.refresh()} disabled={busy}>
                  <RefreshCcw size={13} aria-hidden="true" />
                  <span className="demo-pill-action">Обновить данные</span>
                </button>
              </span>
            ) : (
              <span className="demo-pill">
                <span className="demo-dot" />
                <span className="demo-pill-text">Демоверсия · данные хранятся в этом браузере</span>
                <span className="demo-pill-short">Демо</span>
                <Link to="/login">Сменить профиль</Link>
              </span>
            )}
            <span className="header-date">
              {formatDate(new Date().toISOString(), {
                day: 'numeric',
                month: 'long',
              })}
            </span>
            <NotificationsPopover />
            {server ? (
              <button
                type="button"
                onClick={signOut}
                disabled={busy}
                className="icon-button"
                aria-label="Выйти"
              >
                <LogOut size={18} />
              </button>
            ) : (
              <Link
                to="/login"
                onClick={signOut}
                className="icon-button"
                aria-label="Выйти из демопрофиля"
              >
                <LogOut size={18} />
              </Link>
            )}
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="app-content">
          {/* A new path lifts the page in for a moment; filters and tabs (query) do not. */}
          <div key={location.pathname} className="page-enter">
            <Suspense
              fallback={
                <div className="skeleton-list" aria-label="Загрузка страницы" aria-busy="true">
                  <div />
                  <div />
                  <div />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
export function Toasts() {
  const { toasts, dismissToast } = useWorkspace();
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className={`toast toast-${t.tone}`}
          >
            <span>{t.text}</span>
            <button aria-label="Скрыть уведомление" onClick={() => dismissToast(t.id)}>
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
export function StorageRecovery() {
  const { resetDemo, error } = useWorkspace();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="recovery-page">
      <Brand />
      <h1>Не удалось открыть данные</h1>
      <Notice tone="warning">{error}</Notice>
      <p>
        Текущая запись сохранена в браузере. Сначала скачайте её, если хотите попробовать
        восстановить сведения.
      </p>
      <Button
        onClick={() => {
          const raw = localStorage.getItem(STORAGE_KEY) ?? '';
          const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = 'taskcontrol-recovery.json';
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}
      >
        Скачать сохранённые данные
      </Button>
      <Button variant="secondary" onClick={() => setConfirm(true)}>
        Восстановить демоверсию
      </Button>
      {confirm && (
        <Notice tone="warning">
          <p>Сброс заменит повреждённую запись исходным демонстрационным набором.</p>
          <Button onClick={() => void resetDemo()}>Подтвердить сброс</Button>
        </Notice>
      )}
    </div>
  );
}
