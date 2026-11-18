import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useWorkspace } from '../state/workspace-context';
import { formatDate, isOverdue, nextStatuses, statusLabels, transition } from '../domain/model';
import type { Status, Task } from '../domain/model';
import { Avatar, Empty, PriorityBadge, StatusBadge } from './ui';

export function TaskTable({ tasks, compact = false }: { tasks: Task[]; compact?: boolean }) {
  const { data, user, transact, busy } = useWorkspace();
  const navigate = useNavigate();
  if (!user) return null;
  if (!tasks.length)
    return (
      <Empty title="Задач пока нет" description="Создайте задачу или измените выбранные фильтры." />
    );
  return (
    <div className="table-scroll">
      <table className={`data-table task-table ${compact ? 'table-compact' : ''}`}>
        <thead>
          <tr>
            <th>Задача</th>
            {!compact && <th>Исполнитель</th>}
            <th>Статус</th>
            <th>Срок</th>
            {!compact && <th>Приоритет</th>}
            <th>
              <span className="sr-only">Открыть</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const project = data.projects.find((p) => p.id === task.projectId);
            const assignee = data.users.find((u) => u.id === task.assigneeId);
            const allowed = project ? nextStatuses(user, task, project) : [];
            return (
              <tr key={task.id}>
                <td>
                  <Link to={`/app/tasks/${task.id}`} className="task-title-link">
                    {task.title}
                  </Link>
                  <small>{project?.name}</small>
                </td>
                {!compact && (
                  <td>
                    <span className="person-inline">
                      <Avatar name={assignee?.name ?? '?'} size="small" />
                      <span>{assignee?.name ?? 'Не назначен'}</span>
                    </span>
                  </td>
                )}
                <td>
                  {allowed.length ? (
                    <select
                      className={`status-select status-${task.status}`}
                      aria-label={`Статус задачи «${task.title}»`}
                      value={task.status}
                      disabled={busy}
                      onChange={(e) => {
                        const status = e.target.value as Status;
                        if (task.status === 'in_review' && status === 'in_progress')
                          navigate(`/app/tasks/${task.id}?return=1`);
                        else
                          void transact(
                            (d, u) => transition(d, u, task.id, status),
                            'Статус задачи обновлён.',
                          );
                      }}
                    >
                      <option value={task.status}>{statusLabels[task.status]}</option>
                      {allowed.map((s) => (
                        <option key={s} value={s}>
                          {statusLabels[s]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <StatusBadge status={task.status} />
                  )}
                </td>
                <td className={isOverdue(task) ? 'overdue' : ''}>
                  {formatDate(task.dueDate)}
                  {isOverdue(task) && <small>Просрочена</small>}
                </td>
                {!compact && (
                  <td>
                    <PriorityBadge priority={task.priority} />
                  </td>
                )}
                <td>
                  <Link
                    to={`/app/tasks/${task.id}`}
                    className="icon-button"
                    aria-label={`Открыть задачу «${task.title}»`}
                  >
                    <ArrowUpRight size={18} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
