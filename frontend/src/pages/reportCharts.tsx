import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Task, User } from '../domain/model';
import { formatDate } from '../domain/model';
import { split } from './reportData';
import type { Split } from './reportData';

/* Report charts. Three states only — done, in work, overdue — in one validated palette
   (see --rep-* tokens), so the same colour means the same thing in every chart. */

const parts = [
  { key: 'done', label: 'Выполнено' },
  { key: 'open', label: 'В работе' },
  { key: 'overdue', label: 'Просрочено' },
] as const;

export function Legend() {
  return (
    <ul className="rep-legend" aria-label="Обозначения">
      {parts.map((p) => (
        <li key={p.key}>
          <i data-part={p.key} />
          {p.label}
        </li>
      ))}
    </ul>
  );
}

function describe(s: Split) {
  return `выполнено ${s.done}, в работе ${s.open}, просрочено ${s.overdue}`;
}

function startOfWeek(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  const shift = (d.getDay() + 6) % 7; // Monday first
  d.setDate(d.getDate() - shift);
  return d;
}
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Weeks of the period, or months when the period is longer than twelve weeks. */
function buckets(from: string, until: string) {
  const out: { start: string; end: string; label: string }[] = [];
  const weeks = (new Date(until).getTime() - new Date(from).getTime()) / (7 * 864e5);
  if (weeks <= 12) {
    for (let d = startOfWeek(from); iso(d) <= until; d.setDate(d.getDate() + 7)) {
      const end = new Date(d);
      end.setDate(end.getDate() + 6);
      out.push({
        start: iso(d),
        end: iso(end),
        label: formatDate(iso(d), { day: 'numeric', month: 'short' }),
      });
    }
  } else {
    const d = new Date(from + 'T00:00:00');
    d.setDate(1);
    for (; iso(d) <= until; d.setMonth(d.getMonth() + 1)) {
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      out.push({
        start: iso(d),
        end: iso(end),
        label: formatDate(iso(d), { month: 'short' }),
      });
    }
  }
  return out;
}

/** Stacked columns: how the tasks due in each week stand today. */
export function DeadlineChart({
  tasks,
  from,
  until,
}: {
  tasks: Task[];
  from: string;
  until: string;
}) {
  const columns = buckets(from, until).map((b) => ({
    ...b,
    split: split(tasks.filter((t) => t.dueDate >= b.start && t.dueDate <= b.end)),
  }));
  const max = Math.max(1, ...columns.map((c) => c.split.done + c.split.open + c.split.overdue));
  // The nearest even top, so the plot is filled and the middle line is a whole number.
  const top =
    [2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 30, 40, 50, 60, 80, 100].find((n) => n >= max) ?? max;
  const weekly = columns.length && columns[0].label.match(/\d/);
  return (
    <figure className="rep-figure">
      <div className="rep-columns" style={{ '--count': columns.length } as CSSProperties}>
        <div className="rep-grid" aria-hidden="true">
          {[top, top / 2, 0].map((v) => (
            <span key={v}>{Number.isInteger(v) ? v : ''}</span>
          ))}
        </div>
        {columns.map((c, i) => {
          const total = c.split.done + c.split.open + c.split.overdue;
          const range = `${formatDate(c.start)} — ${formatDate(c.end)}`;
          return (
            <div
              key={c.start}
              className="rep-column"
              style={{ '--i': i } as CSSProperties}
              tabIndex={0}
              aria-label={`${range}: ${total ? describe(c.split) : 'задач нет'}`}
            >
              <div className="rep-stack" style={{ height: `${(total / top) * 100}%` }}>
                {parts.map((p) =>
                  c.split[p.key] ? (
                    <span key={p.key} data-part={p.key} style={{ flexGrow: c.split[p.key] }} />
                  ) : null,
                )}
              </div>
              <span className="rep-tick">{c.label}</span>
              <span className="rep-tip" role="presentation">
                <b>
                  {weekly
                    ? `Неделя с ${formatDate(c.start, { day: 'numeric', month: 'long' })}`
                    : range}
                </b>
                {total ? (
                  parts.map((p) => (
                    <span key={p.key}>
                      <i data-part={p.key} />
                      {p.label}
                      <strong>{c.split[p.key]}</strong>
                    </span>
                  ))
                ) : (
                  <span>Задач со сроком нет</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
      <figcaption className="sr-only">
        По неделям плановых сроков:{' '}
        {columns.map((c) => `${c.label} — ${describe(c.split)}`).join('; ')}.
      </figcaption>
    </figure>
  );
}

/** One horizontal stacked bar per group (person, project…), scaled to the largest. */
export function GroupChart({
  groups,
  tasks,
  empty = 'За выбранный период задач нет.',
}: {
  groups: { id: string; label: string; to: string; match: (task: Task) => boolean }[];
  tasks: Task[];
  empty?: string;
}) {
  const rows = groups
    .map((g) => ({ ...g, split: split(tasks.filter(g.match)) }))
    .map((r) => ({ ...r, total: r.split.done + r.split.open + r.split.overdue }))
    .filter((r) => r.total)
    .sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...rows.map((r) => r.total));
  if (!rows.length) return <p className="muted">{empty}</p>;
  return (
    <div className="rep-people">
      {rows.map((r, i) => (
        <div key={r.id} className="rep-person" style={{ '--i': i } as CSSProperties}>
          <Link to={r.to}>{r.label}</Link>
          <div
            className="rep-bar"
            role="img"
            aria-label={`${r.label}: ${describe(r.split)}`}
            style={{ width: `${(r.total / max) * 100}%` }}
          >
            {parts.map((p) =>
              r.split[p.key] ? (
                <span
                  key={p.key}
                  data-part={p.key}
                  style={{ flexGrow: r.split[p.key] }}
                  title={`${p.label}: ${r.split[p.key]}`}
                />
              ) : null,
            )}
          </div>
          <strong>{r.total}</strong>
        </div>
      ))}
    </div>
  );
}

export function PeopleChart({ tasks, users }: { tasks: Task[]; users: User[] }) {
  return (
    <GroupChart
      tasks={tasks}
      groups={users.map((u) => ({
        id: u.id,
        label: u.name,
        to: `/app/team/${u.id}`,
        match: (t: Task) => t.assigneeId === u.id,
      }))}
    />
  );
}

export function MiniProgress({ value }: { value: number }) {
  return (
    <span className="rep-mini">
      <span>
        <i style={{ width: `${value}%` }} />
      </span>
      {value}%
    </span>
  );
}
