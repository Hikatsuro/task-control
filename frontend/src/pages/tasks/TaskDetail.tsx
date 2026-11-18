import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Download,
  History,
  MessageSquare,
  Paperclip,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ActionLink,
  Avatar,
  Button,
  Confirm,
  Empty,
  Field,
  Modal,
  NotFound,
  Notice,
  PageHeading,
  Panel,
  PriorityBadge,
  Screen,
  StatusBadge,
  Tabs,
} from '../../components/ui';
import { attachmentRepository, MAX_FILE_SIZE } from '../../data/attachments';
import { addAttachment, addComment, removeAttachment, removeComment } from '../../domain/commands';
import {
  canManageProject,
  canViewTask,
  formatDate,
  isOverdue,
  newId,
  nextStatuses,
  transition,
} from '../../domain/model';
import { useWorkspace } from '../../state/workspace-context';

export function TaskDetail({
  historyOnly = false,
  returnOnly = false,
}: {
  historyOnly?: boolean;
  returnOnly?: boolean;
}) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { data, user, transact, notify, busy } = useWorkspace();
  const [tab, setTab] = useState(historyOnly ? 'history' : 'description');
  const [returnOpen, setReturnOpen] = useState(returnOnly || params.get('return') === '1');
  const [deleting, setDeleting] = useState<{ kind: 'comment' | 'file'; id: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const task = data.tasks.find((t) => t.id === id);
  const project = data.projects.find((p) => p.id === task?.projectId);
  if (!user) return null;
  if (!task || !project || !canViewTask(user, task, project)) return <NotFound forbidden />;
  const manage = canManageProject(user, project);
  const allowed = nextStatuses(user, task, project);
  const assignee = data.users.find((u) => u.id === task.assigneeId);
  async function upload(file: File) {
    if (!task || !user) return;
    if (file.size > MAX_FILE_SIZE) {
      notify('Максимальный размер файла — 10 МБ.', 'error');
      return;
    }
    setUploading(true);
    const attachment = {
      id: newId('attachment'),
      name: file.name,
      size: file.size,
      type: file.type,
      authorId: user.id,
      createdAt: new Date().toISOString(),
    };
    try {
      await attachmentRepository.save(attachment.id, file);
      const ok = await transact(
        (d, a) => addAttachment(d, a, task.id, attachment),
        'Файл прикреплён.',
      );
      if (!ok) await attachmentRepository.remove(attachment.id);
    } catch {
      notify('Не удалось сохранить файл в хранилище браузера.', 'error');
    } finally {
      setUploading(false);
    }
  }
  async function download(fileId: string, name: string) {
    try {
      const blob = await attachmentRepository.read(fileId);
      if (!blob) throw new Error('Файл не найден в хранилище этого браузера.');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'Не удалось открыть файл.', 'error');
    }
  }
  return (
    <Screen>
      <PageHeading
        title={historyOnly ? 'История задачи' : task.title}
        description={project.name}
        back="/app/tasks"
        action={
          manage &&
          project.status === 'active' && (
            <ActionLink secondary to={`/app/tasks/${task.id}/edit`}>
              Редактировать задачу
            </ActionLink>
          )
        }
      />
      <div className="task-detail-layout">
        <div>
          <div className="task-detail-status">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {isOverdue(task) && <span className="badge status-overdue">Просрочена</span>}
            <span className="muted">Создана {formatDate(task.createdAt)}</span>
          </div>
          <Tabs
            options={[
              { value: 'description', label: 'Описание' },
              { value: 'comments', label: `Комментарии · ${task.comments.length}` },
              { value: 'files', label: `Файлы · ${task.attachments.length}` },
              { value: 'history', label: 'История' },
            ]}
            value={tab}
            onChange={setTab}
          />
          {tab === 'description' ? (
            <Panel>
              <h2>Ожидаемый результат</h2>
              <p className="prose preserve-lines">
                {task.description || 'Описание пока не добавлено.'}
              </p>
              <div className="inline-actions">
                <Button variant="secondary" onClick={() => setTab('comments')}>
                  <MessageSquare size={17} />
                  Обсудить задачу
                </Button>
                <Button variant="secondary" onClick={() => setTab('files')}>
                  <Paperclip size={17} />
                  Прикрепить файл
                </Button>
              </div>
            </Panel>
          ) : tab === 'comments' ? (
            <Panel title="Обсуждение">
              <div className="comments-list">
                {task.comments.length ? (
                  task.comments.map((comment) => (
                    <article key={comment.id}>
                      <Avatar
                        name={data.users.find((u) => u.id === comment.authorId)?.name ?? '?'}
                      />
                      <div>
                        <header>
                          <strong>{data.users.find((u) => u.id === comment.authorId)?.name}</strong>
                          <time>
                            {formatDate(comment.createdAt, {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </time>
                          {comment.authorId === user.id && (
                            <Button
                              variant="ghost"
                              aria-label="Удалить свой комментарий"
                              onClick={() => setDeleting({ kind: 'comment', id: comment.id })}
                            >
                              <Trash2 size={15} />
                            </Button>
                          )}
                        </header>
                        <p className="preserve-lines">{comment.text}</p>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="muted">
                    Начните обсуждение: уточните детали или расскажите о результате.
                  </p>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const text = String(new FormData(form).get('comment'));
                  void transact(
                    (d, a) => addComment(d, a, task.id, text),
                    'Комментарий добавлен.',
                  ).then((ok) => {
                    if (ok) form.reset();
                  });
                }}
              >
                <Field label="Комментарий">
                  <textarea
                    name="comment"
                    rows={3}
                    maxLength={5000}
                    required
                    placeholder="Напишите сообщение команде"
                  />
                </Field>
                <Button type="submit" disabled={busy}>
                  Отправить комментарий <ArrowRight size={16} />
                </Button>
              </form>
            </Panel>
          ) : tab === 'files' ? (
            <Panel title="Прикреплённые файлы">
              <Notice>
                Файлы сохраняются в этом браузере. Максимальный размер одного файла — 10 МБ.
              </Notice>
              <Field label={uploading ? 'Сохраняем файл…' : 'Добавить файл'}>
                <input
                  type="file"
                  disabled={uploading || busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(file);
                    e.target.value = '';
                  }}
                />
              </Field>
              {task.attachments.length ? (
                <div className="files-list">
                  {task.attachments.map((file) => (
                    <div key={file.id}>
                      <Paperclip size={20} />
                      <span>
                        <strong>{file.name}</strong>
                        <small>
                          {Math.max(1, Math.round(file.size / 1024))} КБ ·{' '}
                          {formatDate(file.createdAt)}
                        </small>
                      </span>
                      <Button
                        variant="ghost"
                        onClick={() => void download(file.id, file.name)}
                        aria-label={`Скачать ${file.name}`}
                      >
                        <Download size={18} />
                      </Button>
                      {file.authorId === user.id && (
                        <Button
                          variant="ghost"
                          onClick={() => setDeleting({ kind: 'file', id: file.id })}
                          aria-label={`Удалить ${file.name}`}
                        >
                          <Trash2 size={17} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  title="Файлы ещё не добавлены"
                  description="Прикрепите документ, изображение или результат работы."
                />
              )}
            </Panel>
          ) : (
            <Panel title="История изменений">
              <ol className="timeline">
                {[...task.activity].reverse().map((item) => (
                  <li key={item.id}>
                    <History size={17} />
                    <div>
                      <p>{item.text}</p>
                      <small>
                        {data.users.find((u) => u.id === item.authorId)?.name} ·{' '}
                        {formatDate(item.createdAt, {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
              {!task.activity.length && <p className="muted">Изменений пока нет.</p>}
            </Panel>
          )}
        </div>
        <aside>
          <Panel title="Параметры задачи">
            <dl className="details">
              <div>
                <dt>Исполнитель</dt>
                <dd>
                  <span className="person-inline">
                    <Avatar name={assignee?.name ?? '?'} />
                    {assignee?.name}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Проект</dt>
                <dd>
                  <Link to={`/app/projects/${project.id}`}>{project.name}</Link>
                </dd>
              </div>
              <div>
                <dt>Плановый срок</dt>
                <dd className={isOverdue(task) ? 'overdue' : ''}>
                  <CalendarDays size={16} />
                  {formatDate(task.dueDate)}
                </dd>
              </div>
              <div>
                <dt>Фактически выполнена</dt>
                <dd>
                  <Clock3 size={16} />
                  {task.completedAt ? formatDate(task.completedAt) : 'Работа не принята'}
                </dd>
              </div>
            </dl>
            {allowed.length > 0 && (
              <div className="task-action-stack">
                {allowed.map((status) => (
                  <Button
                    key={status}
                    variant={
                      status === 'in_progress' && task.status === 'in_review'
                        ? 'secondary'
                        : 'primary'
                    }
                    disabled={busy}
                    onClick={() => {
                      if (task.status === 'in_review' && status === 'in_progress')
                        setReturnOpen(true);
                      else
                        void transact(
                          (d, a) => transition(d, a, task.id, status),
                          status === 'done' ? 'Работа принята.' : 'Статус задачи обновлён.',
                        );
                    }}
                  >
                    {status === 'done'
                      ? 'Принять работу'
                      : status === 'in_review'
                        ? 'Отправить на проверку'
                        : task.status === 'in_review'
                          ? 'Вернуть на доработку'
                          : task.status === 'done'
                            ? 'Возобновить работу'
                            : 'Взять в работу'}
                  </Button>
                ))}
              </div>
            )}
            {task.status === 'in_review' && !manage && (
              <Notice>Результат ожидает проверки руководителя.</Notice>
            )}
            {task.status === 'done' && (
              <Notice tone="success">Результат принят руководителем.</Notice>
            )}
          </Panel>
          <Link className="text-link" to={`/app/tasks/${task.id}/history`}>
            <History size={16} />
            Вся история задачи
          </Link>
        </aside>
      </div>
      <Modal
        open={returnOpen && manage && task.status === 'in_review'}
        onClose={() => setReturnOpen(false)}
        title="Вернуть на доработку"
      >
        <p>Объясните, что нужно исправить. Причина сохранится в истории задачи.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const reason = String(new FormData(e.currentTarget).get('reason'));
            void transact(
              (d, a) => transition(d, a, task.id, 'in_progress', reason),
              'Задача возвращена на доработку.',
            ).then((ok) => {
              if (ok) setReturnOpen(false);
            });
          }}
        >
          <Field label="Причина возврата" required>
            <textarea name="reason" rows={4} minLength={3} maxLength={2000} required autoFocus />
          </Field>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setReturnOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={busy}>
              Вернуть на доработку
            </Button>
          </div>
        </form>
      </Modal>
      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={deleting?.kind === 'file' ? 'Удалить файл?' : 'Удалить комментарий?'}
        description="Это действие нельзя отменить."
        danger
        actionLabel="Удалить"
        busy={busy}
        onConfirm={() => {
          if (!deleting) return;
          const item = deleting;
          void transact(
            (d, a) =>
              item.kind === 'comment'
                ? removeComment(d, a, task.id, item.id)
                : removeAttachment(d, a, task.id, item.id),
            'Удалено.',
          ).then(async (ok) => {
            if (ok) {
              setDeleting(null);
              if (item.kind === 'file')
                try {
                  await attachmentRepository.remove(item.id);
                } catch {
                  notify('Запись удалена; браузер не смог очистить содержимое файла.', 'info');
                }
            }
          });
        }}
      />
    </Screen>
  );
}
