import { Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Field } from '../../components/ui';
import {
  availableProjects,
  priorities,
  priorityLabels,
  statuses,
  statusLabels,
} from '../../domain/model';
import { useFilteredTasks } from './useFilteredTasks';

export function TaskFilters({ view }: { view: 'list' | 'board' | 'calendar' }) {
  const { data, user, params, change } = useFilteredTasks();
  const [expanded, setExpanded] = useState(false);
  if (!user) return null;
  const query = params.toString();
  return (
    <>
      <div className="filter-toolbar">
        <nav className="view-tabs" aria-label="Вид задач">
          {[
            ['list', '/app/tasks', 'Список'],
            ['board', '/app/board', 'Kanban'],
            ['calendar', '/app/calendar', 'Календарь'],
          ].map(([id, path, title]) => (
            <Link
              key={id}
              to={`${path}${query ? '?' + query : ''}`}
              aria-current={id === view ? 'page' : undefined}
            >
              {title}
            </Link>
          ))}
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
