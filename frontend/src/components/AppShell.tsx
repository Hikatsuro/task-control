import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Bell, ChevronDown, HelpCircle, LogOut, Menu, Settings, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useWorkspace } from '../state/workspace-context';
import { formatDate, roleLabels } from '../domain/model';
import { Avatar, Brand, Button, Notice } from './ui';

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
export function AppShell() {
  const { data, user, ready, signOut } = useWorkspace();
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
  const title =
    items.find(([, path]) =>
      path === '/app' ? location.pathname === path : location.pathname.startsWith(path),
    )?.[2] ?? 'Рабочее пространство';
  const unread = data.notifications.filter((n) => n.userId === user.id && !n.read).length;
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
          <Brand />
          <Button
            variant="ghost"
            className="mobile-only"
            aria-label="Закрыть меню"
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} />
          </Button>
        </div>
        <div className="workspace-label">
          <span>Рабочая группа</span>
          <strong>{data.settings.name}</strong>
        </div>
        <nav aria-label="Основная навигация" className="sidebar-nav">
          {items.map(([icon, path, label]) => (
            <NavLink key={path} to={path} end={path === '/app'} onClick={() => setMenuOpen(false)}>
              <img src={`/icons/${icon}.svg`} alt="" width="20" height="20" />
              <span>{label}</span>
            </NavLink>
          ))}
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
          <span className="breadcrumb">
            Рабочее пространство <span>/</span> {title}
          </span>
          <div className="header-actions">
            <span className="header-date">
              {formatDate(new Date().toISOString(), {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <Link
              to="/app/notifications"
              className="notification-link"
              aria-label={`Уведомления: ${unread} непрочитанных`}
            >
              <Bell size={18} />
              {unread > 0 && <span>{unread}</span>}
            </Link>
            <Link
              to="/login"
              onClick={signOut}
              className="icon-button"
              aria-label="Выйти из демопрофиля"
            >
              <LogOut size={18} />
            </Link>
          </div>
        </header>
        <div className="demo-strip">
          <span className="demo-dot" />
          <span>Локальная демоверсия</span>
          <span className="demo-divider">·</span>
          <span className="demo-persistence">Изменения сохраняются в этом браузере</span>
          <Link to="/login">Сменить профиль</Link>
        </div>
        <main id="main-content" tabIndex={-1} className="app-content">
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
        </main>
        <footer className="app-footer">
          <span>TaskControl · Рабочее пространство команды</span>
          <Link to="/app/help/screens">Карта экранов</Link>
        </footer>
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
          const raw = localStorage.getItem('taskcontrol.workspace.v1') ?? '';
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
