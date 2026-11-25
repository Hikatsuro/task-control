import { useState } from 'react';
import {
  CheckCheck,
  CirclePlay,
  ClipboardPlus,
  CornerDownLeft,
  History,
  MessageSquare,
  Paperclip,
  PencilLine,
  ScanSearch,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Task, User } from '../../domain/model';
import { formatDate, statusLabels } from '../../domain/model';
import { Avatar, Tabs } from '../../components/ui';

/* The task's audit log: status changes, comments and files in one dated feed. Status
   changes are stored as «Было → Стало[. причина]»; that text is read back into an event
   with its own icon, colour and, for a return, the reason quoted beneath. */

type Kind =
  | 'created'
  | 'edited'
  | 'started'
  | 'review'
  | 'returned'
  | 'accepted'
  | 'comment'
  | 'file'
  | 'other';
type Event = {
  id: string;
  kind: Kind;
  title: string;
  detail?: string;
  authorId: string;
  at: string;
  /** Position among the task's activity entries, for ties in time. */
  order?: number;
};

const look: Record<Kind, { icon: LucideIcon; tone: string; tag: string }> = {
  created: { icon: ClipboardPlus, tone: 'neutral', tag: 'Создание' },
  edited: { icon: PencilLine, tone: 'neutral', tag: 'Изменение' },
  started: { icon: CirclePlay, tone: 'progress', tag: 'Статус' },
  review: { icon: ScanSearch, tone: 'review', tag: 'Проверка' },
  returned: { icon: CornerDownLeft, tone: 'returned', tag: 'Возврат' },
  accepted: { icon: CheckCheck, tone: 'done', tag: 'Приёмка' },
  comment: { icon: MessageSquare, tone: 'neutral', tag: 'Комментарий' },
  file: { icon: Paperclip, tone: 'neutral', tag: 'Файл' },
  other: { icon: History, tone: 'neutral', tag: 'Событие' },
};

// Django writes the accepted state as «Принята», the browser demo as «Выполнена».
const doneLabels = [statusLabels.done, 'Принята'],
  review = statusLabels.in_review,
  work = statusLabels.in_progress;

function read(text: string): Pick<Event, 'kind' | 'title' | 'detail'> {
  if (text.startsWith('Задача создана'))
    return { kind: 'created', title: 'Задача создана, назначен исполнитель' };
  if (text.startsWith('Обновлены')) return { kind: 'edited', title: 'Сведения о задаче изменены' };
  const move = text.match(/^(.+?) → (.+?)(?:\. ([\s\S]+))?$/);
  if (!move) return { kind: 'other', title: text };
  const [, from, to, reason] = move;
  if (doneLabels.includes(to)) return { kind: 'accepted', title: 'Работа принята' };
  if (to === review) return { kind: 'review', title: 'Результат отправлен на проверку' };
  if (from === review && to === work)
    return { kind: 'returned', title: 'Возвращена на доработку', detail: reason };
  if (to === work)
    return {
      kind: 'started',
      title: doneLabels.includes(from) ? 'Работа возобновлена' : 'Задача взята в работу',
    };
  return { kind: 'other', title: `${from} → ${to}`, detail: reason };
}

export function TaskHistory({ task, users }: { task: Task; users: User[] }) {
  const [filter, setFilter] = useState('all');
  const events: Event[] = [
    // Entries are appended in the order they happened; that order breaks ties between
    // entries with the same time (seed data, quick consecutive actions).
    ...task.activity.map((a, order) => ({
      id: a.id,
      authorId: a.authorId,
      at: a.createdAt,
      order,
      ...read(a.text),
    })),
    ...task.comments.map((c) => ({
      id: c.id,
      kind: 'comment' as const,
      title: 'Комментарий',
      detail: c.text,
      authorId: c.authorId,
      at: c.createdAt,
    })),
    ...task.attachments.map((f) => ({
      id: f.id,
      kind: 'file' as const,
      title: `Файл «${f.name}»`,
      authorId: f.authorId,
      at: f.createdAt,
    })),
  ]
    .filter((e) =>
      filter === 'all'
        ? true
        : filter === 'status'
          ? !['comment', 'file'].includes(e.kind)
          : e.kind === filter,
    )
    .sort((a: Event, b: Event) => b.at.localeCompare(a.at) || (b.order ?? 0) - (a.order ?? 0));
  return (
    <div className="history">
      <Tabs
        label="Какие события показать"
        options={[
          { value: 'all', label: 'Все' },
          { value: 'status', label: 'Статусы' },
          { value: 'comment', label: 'Комментарии' },
          { value: 'file', label: 'Файлы' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {events.length ? (
        <ol className="history-feed">
          {events.map((e) => {
            const { icon: Icon, tone, tag } = look[e.kind];
            const author = users.find((u) => u.id === e.authorId)?.name ?? 'Участник';
            return (
              <li key={e.id} data-tone={tone}>
                <span className="history-icon" aria-hidden="true">
                  <Icon size={17} />
                </span>
                <div className="history-body">
                  <p className="history-title">{e.title}</p>
                  <span className="history-by">
                    <Avatar name={author} size="small" />
                    {author}
                  </span>
                  {e.detail && <blockquote className="preserve-lines">{e.detail}</blockquote>}
                </div>
                <div className="history-meta">
                  <span className="history-tag">{tag}</span>
                  <time dateTime={e.at}>
                    {formatDate(e.at, {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="muted">Таких событий пока нет.</p>
      )}
    </div>
  );
}
