import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  ChartColumn,
  Columns3,
  CornerDownLeft,
  FolderOpen,
  ListTodo,
  Moon,
  Plus,
  Search,
  Settings,
  SquareCheck,
  User as UserIcon,
} from 'lucide-react';
import { useWorkspace } from '../state/workspace-context';
import { setTheme, useTheme } from '../state/theme';
import { availableProjects, availableTasks, formatDate, statusLabels } from '../domain/model';

/* Ctrl + K: find a task, project or person, or run an action, without leaving the keyboard.
   A native <dialog> keeps focus inside and closes on Escape. */

type Item = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
};

export function CommandMenu() {
  const { data, user } = useWorkspace();
  const navigate = useNavigate();
  const theme = useTheme();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  // Every close resets the search, so the menu always opens clean.
  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActive(0);
  }, []);

  useEffect(() => {
    const key = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (dialog.current?.open) close();
        else setOpen(true);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [close]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      requestAnimationFrame(() => input.current?.focus());
    } else if (!open && el.open) el.close();
  }, [open]);

  const items = useMemo<Item[]>(() => {
    if (!user) return [];
    const go = (path: string) => () => {
      close();
      navigate(path);
    };
    const q = query.trim().toLocaleLowerCase();
    const has = (text: string) => !q || text.toLocaleLowerCase().includes(q);
    const manager = user.role === 'manager';
    const actions: Item[] = [
      ...(manager
        ? [
            {
              id: 'new-task',
              label: 'Создать задачу',
              icon: <Plus size={17} />,
              run: go('/app/tasks/new'),
            },
          ]
        : []),
      { id: 'tasks', label: 'Открыть задачи', icon: <ListTodo size={17} />, run: go('/app/tasks') },
      { id: 'board', label: 'Открыть доску', icon: <Columns3 size={17} />, run: go('/app/board') },
      {
        id: 'calendar',
        label: 'Открыть календарь',
        icon: <CalendarDays size={17} />,
        run: go('/app/calendar'),
      },
      ...(manager
        ? [
            {
              id: 'reports',
              label: 'Открыть отчёты',
              icon: <ChartColumn size={17} />,
              run: go('/app/reports'),
            },
          ]
        : []),
      {
        id: 'notifications',
        label: 'Уведомления',
        icon: <Bell size={17} />,
        run: go('/app/notifications'),
      },
      {
        id: 'settings',
        label: 'Настройки',
        icon: <Settings size={17} />,
        run: go('/app/settings'),
      },
      {
        id: 'theme',
        label: theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему',
        icon: <Moon size={17} />,
        run: () => {
          setTheme(theme === 'dark' ? 'light' : 'dark');
          close();
        },
      },
    ]
      .filter((a) => has(a.label))
      .map((a) => ({ ...a, group: 'Действия' }));
    if (user.role === 'admin') return actions;
    const tasks = availableTasks(data, user)
      .filter((t) => (q ? has(t.title) : t.status !== 'done'))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, q ? 6 : 4)
      .map((t) => ({
        id: 'task-' + t.id,
        group: 'Задачи',
        label: t.title,
        hint: `${statusLabels[t.status]} · ${formatDate(t.dueDate)}`,
        icon: <SquareCheck size={17} />,
        run: go(`/app/tasks/${t.id}`),
      }));
    const projects = q
      ? availableProjects(data, user)
          .filter((p) => has(p.name))
          .slice(0, 4)
          .map((p) => ({
            id: 'project-' + p.id,
            group: 'Проекты',
            label: p.name,
            icon: <FolderOpen size={17} />,
            run: go(`/app/projects/${p.id}`),
          }))
      : [];
    const people = q
      ? data.users
          .filter((u) => u.role !== 'admin' && has(u.name))
          .slice(0, 4)
          .map((u) => ({
            id: 'user-' + u.id,
            group: 'Команда',
            label: u.name,
            hint: u.position,
            icon: <UserIcon size={17} />,
            run: go(`/app/team/${u.id}`),
          }))
      : [];
    // With a query, matches come first; without one, actions lead.
    return q ? [...tasks, ...projects, ...people, ...actions] : [...actions, ...tasks];
  }, [data, user, query, theme, navigate, close]);

  const current = Math.min(active, Math.max(0, items.length - 1));

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((current + 1) % Math.max(1, items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((current - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      items[current]?.run();
    }
  }

  useEffect(() => {
    document.getElementById(`cmd-${items[current]?.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [current, items]);

  if (!user) return null;
  let group = '';
  return (
    <>
      <button
        type="button"
        className="command-trigger"
        aria-label="Поиск по задачам, проектам и людям"
        onClick={() => setOpen(true)}
      >
        <Search size={16} aria-hidden="true" />
        <span className="command-trigger-text" aria-hidden="true">
          <span className="command-trigger-long">Поиск задач, проектов и людей</span>
          <span className="command-trigger-short">Поиск задач и людей</span>
        </span>
        <kbd aria-hidden="true">Ctrl K</kbd>
      </button>
      <dialog
        ref={dialog}
        className="command-menu"
        aria-label="Поиск и действия"
        onCancel={close}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="command-input">
          <Search size={18} />
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            placeholder="Задача, проект, человек или действие…"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
            aria-activedescendant={items[current] ? `cmd-${items[current].id}` : undefined}
            aria-label="Поиск по TaskControl"
          />
          <kbd>Esc</kbd>
        </div>
        <ul id="command-results" role="listbox" className="command-results">
          {items.length ? (
            items.map((item, i) => {
              const header = item.group !== group ? item.group : null;
              group = item.group;
              return (
                <li key={item.id} role="presentation">
                  {header && <span className="command-group">{header}</span>}
                  <div
                    id={`cmd-${item.id}`}
                    role="option"
                    aria-selected={i === current}
                    className="command-item"
                    onMouseMove={() => setActive(i)}
                    onClick={item.run}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.hint && <small>{item.hint}</small>}
                    {i === current && <CornerDownLeft size={14} className="command-enter" />}
                  </div>
                </li>
              );
            })
          ) : (
            <li className="command-empty">Ничего не нашлось</li>
          )}
        </ul>
        <div className="command-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> выбрать
          </span>
          <span>
            <kbd>Enter</kbd> открыть
          </span>
          <span>
            <kbd>Esc</kbd> закрыть
          </span>
        </div>
      </dialog>
    </>
  );
}
