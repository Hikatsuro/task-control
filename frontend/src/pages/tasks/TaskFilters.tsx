import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Field } from '../../components/ui';
import { useTabIndicator } from '../../components/useTabIndicator';
import {
  availableProjects,
  formatDate,
  priorities,
  priorityLabels,
  statuses,
  statusLabels,
} from '../../domain/model';
import type { Priority, Status } from '../../domain/model';
import { useFilteredTasks } from './useFilteredTasks';

const periodLabels: Record<string, string> = {
  today: 'Сегодня',
  week: 'Ближайшая неделя',
  month: 'Ближайшие 30 дней',
};

/** Applied filters as removable chips, with one action to clear them all. */
function ActiveFilters() {
  const { data, params, change } = useFilteredTasks();
  const [, setParams] = useSearchParams();
  const name = (list: { id: string; name: string }[], id: string) =>
    list.find((x) => x.id === id)?.name ?? id;
  const chips = [
    ['q', 'Поиск', (v: string) => `«${v}»`],
    ['project', 'Проект', (v: string) => name(data.projects, v)],
    [
      'status',
      'Статус',
      (v: string) => (v === 'overdue' ? 'Просроченные' : (statusLabels[v as Status] ?? v)),
    ],
    ['assignee', 'Исполнитель', (v: string) => name(data.users, v)],
    ['priority', 'Приоритет', (v: string) => priorityLabels[v as Priority] ?? v],
    ['period', 'Период', (v: string) => periodLabels[v] ?? v],
    ['from', 'Срок от', (v: string) => formatDate(v)],
    ['until', 'Срок до', (v: string) => formatDate(v)],
  ] as const;
  const active = chips.filter(([key]) => params.get(key));
  if (!active.length) return null;
  return (
    <div className="filter-chips" aria-label="Применённые фильтры">
      {active.map(([key, label, show]) => (
        <span key={key} className="filter-chip">
          <span>
            {label}: <b>{show(params.get(key) ?? '')}</b>
          </span>
          <button
            type="button"
            aria-label={`Убрать фильтр «${label}»`}
            onClick={() => change(key, '')}
          >
            <X size={14} />
          </button>
        </span>
      ))}
      <button
        type="button"
        className="filter-clear"
        onClick={() => {
          // Keep the sort order and the «mine» scope; drop every filter.
          const current = new URLSearchParams(window.location.search);
          const next = new URLSearchParams();
          for (const keep of ['sort', 'mine']) {
            const value = current.get(keep);
            if (value) next.set(keep, value);
          }
          setParams(next, { replace: true });
        }}
      >
        Сбросить всё
      </button>
    </div>
  );
}

export function TaskFilters({ view }: { view: 'list' | 'board' | 'calendar' }) {
  const { data, user, params, change } = useFilteredTasks();
  const [expanded, setExpanded] = useState(false);
  // List, Kanban and Calendar are separate routes; the underline carries over between them.
  const viewTabs = useTabIndicator<HTMLElement>(view, 'task-views');
  if (!user) return null;
  const query = params.toString();
  return (
    <>
      <div className="filter-toolbar">
        <nav ref={viewTabs} className="view-tabs has-indicator" aria-label="Вид задач">
          {[
            ['list', '/app/tasks', 'Список'],
            ['board', '/app/board', 'Kanban'],
            ['calendar', '/app/calendar', 'Календарь'],
          ].map(([id, path, title]) => (
            <Link
              key={id}
              to={`${path}${query ? '?' + query : ''}`}
              aria-current={id === view ? 'page' : undefined}
              data-active={id === view}
            >
              {title}
            </Link>
          ))}
          <span className="tab-indicator" aria-hidden="true" />
        </nav>
        <div className="filter-inputs">
          <label className="search-field">
            <Search size={17} />
            <input
              placeholder="Поиск задачи"
              aria-label="Поиск задачи"
              value={params.get('q') ?? ''}
              onChange={(e) => change('q', e.target.value)}
            />
          </label>
          <Button
            variant="secondary"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            Фильтры{' '}
            {['project', 'status', 'assignee', 'priority', 'period', 'from', 'until'].filter((k) =>
              params.get(k),
            ).length || ''}
          </Button>
        </div>
      </div>
      <div className="filters-row">
        <select
          aria-label="Фильтр по проекту"
          value={params.get('project') ?? ''}
          onChange={(e) => change('project', e.target.value)}
        >
          <option value="">Все проекты</option>
          {availableProjects(data, user).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Фильтр по статусу"
          value={params.get('status') ?? ''}
          onChange={(e) => change('status', e.target.value)}
        >
          <option value="">Все статусы</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
          <option value="overdue">Просроченные</option>
        </select>
        <select
          aria-label="Сортировка задач"
          value={params.get('sort') ?? 'due'}
          onChange={(e) => change('sort', e.target.value)}
        >
          <option value="due">По сроку</option>
          <option value="created">По дате создания</option>
          <option value="priority">По приоритету</option>
        </select>
        <select
          aria-label="Период задач"
          value={params.get('period') ?? ''}
          onChange={(e) => change('period', e.target.value)}
        >
          <option value="">Любой период</option>
          <option value="today">Сегодня</option>
          <option value="week">Ближайшая неделя</option>
          <option value="month">Ближайшие 30 дней</option>
        </select>
      </div>
      <ActiveFilters />
      {expanded && (
        <div className="advanced-filters">
          <Field label="Исполнитель">
            <select
              value={params.get('assignee') ?? ''}
              onChange={(e) => change('assignee', e.target.value)}
            >
              <option value="">Все исполнители</option>
              {data.users
                .filter((u) => u.role !== 'admin')
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Приоритет">
            <select
              value={params.get('priority') ?? ''}
              onChange={(e) => change('priority', e.target.value)}
            >
              <option value="">Любой</option>
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {priorityLabels[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Срок от">
            <input
              type="date"
              value={params.get('from') ?? ''}
              onChange={(e) => change('from', e.target.value)}
            />
          </Field>
          <Field label="Срок до">
            <input
              type="date"
              value={params.get('until') ?? ''}
              onChange={(e) => change('until', e.target.value)}
            />
          </Field>
          <Link
            className="text-link"
            to={
              view === 'board' ? '/app/board' : view === 'calendar' ? '/app/calendar' : '/app/tasks'
            }
          >
            Сбросить фильтры
          </Link>
        </div>
      )}
    </>
  );
}
