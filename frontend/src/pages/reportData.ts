import type { Task } from '../domain/model';
import { isOverdue } from '../domain/model';

// Report figures in three states — done, in work, overdue — shared by every chart.
export type Split = { done: number; open: number; overdue: number };

export function split(tasks: Task[]): Split {
  let done = 0,
    open = 0,
    overdue = 0;
  for (const t of tasks) {
    if (t.status === 'done') done++;
    else if (isOverdue(t)) overdue++;
    else open++;
  }
  return { done, open, overdue };
}

/** Average days from creation to acceptance, over accepted tasks. */
export function averageDays(tasks: Task[]) {
  const done = tasks.filter((t) => t.status === 'done' && t.completedAt);
  if (!done.length) return null;
  const days = done.map(
    (t) =>
      (new Date(t.completedAt ?? t.createdAt).getTime() - new Date(t.createdAt).getTime()) / 864e5,
  );
  return Math.max(0, Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10);
}

/** Share of accepted tasks that were accepted on or before their due date. */
export function onTimeShare(tasks: Task[]) {
  const done = tasks.filter((t) => t.status === 'done' && t.completedAt);
  if (!done.length) return null;
  const onTime = done.filter((t) => (t.completedAt ?? '').slice(0, 10) <= t.dueDate).length;
  return Math.round((onTime / done.length) * 100);
}
