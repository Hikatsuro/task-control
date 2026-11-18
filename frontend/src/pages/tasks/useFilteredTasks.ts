import { useSearchParams } from 'react-router-dom';
import { availableTasks, isOverdue, localDate, offsetDate, priorities } from '../../domain/model';
import { useWorkspace } from '../../state/workspace-context';

export function useFilteredTasks() {
  const { data, user } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const tasks = user
    ? availableTasks(data, user)
        .filter((t) => {
          if (params.get('project') && t.projectId !== params.get('project')) return false;
          if (params.get('assignee') && t.assigneeId !== params.get('assignee')) return false;
          if (params.get('mine') === '1' && t.assigneeId !== user.id) return false;
          if (params.get('status') === 'overdue' && !isOverdue(t)) return false;
          if (
            params.get('status') &&
            params.get('status') !== 'overdue' &&
            t.status !== params.get('status')
          )
            return false;
          if (params.get('priority') && t.priority !== params.get('priority')) return false;
          if (
            params.get('q') &&
            !t.title.toLocaleLowerCase().includes(params.get('q')!.toLocaleLowerCase())
          )
            return false;
          const period = params.get('period');
          if (period) {
            const end =
              period === 'today' ? localDate() : period === 'week' ? offsetDate(7) : offsetDate(30);
            if (!t.dueDate || t.dueDate < localDate() || t.dueDate > end) return false;
          }
          if (params.get('from') && (!t.dueDate || t.dueDate < params.get('from')!)) return false;
          if (params.get('until') && (!t.dueDate || t.dueDate > params.get('until')!)) return false;
          return true;
        })
        .sort((a, b) =>
          params.get('sort') === 'priority'
            ? priorities.indexOf(b.priority) - priorities.indexOf(a.priority)
            : params.get('sort') === 'created'
              ? b.createdAt.localeCompare(a.createdAt)
              : (a.dueDate || '9999').localeCompare(b.dueDate || '9999'),
        )
    : [];
  return { data, user, params, change, tasks };
}
