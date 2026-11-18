import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ActionLink,
  Button,
  Empty,
  Field,
  NotFound,
  Notice,
  PageHeading,
  Panel,
  Screen,
} from '../../components/ui';
import { saveTask } from '../../domain/commands';
import type { Priority } from '../../domain/model';
import {
  availableProjects,
  canManageProject,
  formatDate,
  priorities,
  priorityLabels,
} from '../../domain/model';
import { useWorkspace } from '../../state/workspace-context';

export function TaskForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { data, user, transact, busy } = useWorkspace();
  const navigate = useNavigate();
  const task = data.tasks.find((t) => t.id === id);
  const [projectId, setProjectId] = useState(task?.projectId ?? params.get('project') ?? '');
  if (!user) return null;
  const managed = availableProjects(data, user).filter(
    (p) => canManageProject(user, p) && p.status === 'active',
  );
  if (user.role !== 'manager' || (id && !task)) return <NotFound forbidden />;
  const project = managed.find((p) => p.id === projectId);
  if (id && !managed.some((p) => p.id === task?.projectId)) return <NotFound forbidden />;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const ok = await transact(
      (d, a) =>
        saveTask(
          d,
          a,
          {
            title: String(f.get('title')),
            description: String(f.get('description')),
            projectId: String(f.get('projectId')),
            assigneeId: String(f.get('assigneeId')),
            dueDate: String(f.get('dueDate')),
            priority: String(f.get('priority')) as Priority,
          },
          id,
        ),
      id ? 'Задача обновлена.' : 'Задача создана.',
    );
    if (ok) navigate(id ? `/app/tasks/${id}` : '/app/tasks');
  }
  return (
    <Screen>
      <PageHeading
        title={id ? 'Редактирование задачи' : 'Создание задачи'}
        description="Добавьте контекст, назначьте исполнителя и договоритесь о сроке."
        back={id ? `/app/tasks/${id}` : '/app/tasks'}
      />
      {managed.length ? (
        <form className="form-layout" onSubmit={(e) => void submit(e)}>
          <Panel title="Задача">
            <Field label="Название" required>
              <input
                name="title"
                minLength={3}
                maxLength={160}
                required
                defaultValue={task?.title}
                placeholder="Что нужно сделать"
              />
            </Field>
            <Field label="Описание">
              <textarea
                name="description"
                rows={8}
                maxLength={10000}
                defaultValue={task?.description}
                placeholder="Опишите ожидаемый результат и критерии приёмки"
              />
            </Field>
            <Notice>Комментарии и файлы можно добавить после создания задачи.</Notice>
            <div className="form-actions">
              <ActionLink to={id ? `/app/tasks/${id}` : '/app/tasks'} secondary>
                Отмена
              </ActionLink>
              <Button type="submit" disabled={busy}>
                {busy ? 'Сохраняем…' : id ? 'Сохранить изменения' : 'Создать задачу'}
              </Button>
            </div>
          </Panel>
          <Panel title="Параметры">
            <Field label="Проект" required>
              <select
                name="projectId"
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={!!id}
              >
                <option value="" disabled>
                  Выберите проект
                </option>
                {managed.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            {id && <input type="hidden" name="projectId" value={projectId} />}
            <Field label="Исполнитель" required>
              <select
                key={projectId}
                name="assigneeId"
                defaultValue={task?.assigneeId ?? ''}
                required
              >
                <option value="" disabled>
                  Выберите участника
                </option>
                {data.users
                  .filter((u) => u.active && project?.memberIds.includes(u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field
              label="Срок выполнения"
              hint={
                project
                  ? `В пределах проекта: ${formatDate(project.startDate)} — ${formatDate(project.dueDate)}`
                  : 'Сначала выберите проект'
              }
            >
              <input
                name="dueDate"
                type="date"
                min={project?.startDate}
                max={project?.dueDate}
                defaultValue={task?.dueDate}
              />
            </Field>
            <Field label="Приоритет">
              <select name="priority" defaultValue={task?.priority ?? 'medium'}>
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {priorityLabels[p]}
                  </option>
                ))}
              </select>
            </Field>
          </Panel>
        </form>
      ) : (
        <Empty
          title="Сначала нужен активный проект"
          description="Создайте проект и добавьте участников, чтобы назначать задачи."
          action={<ActionLink to="/app/projects/new">Создать проект</ActionLink>}
        />
      )}
    </Screen>
  );
}
