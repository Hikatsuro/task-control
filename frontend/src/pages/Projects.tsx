import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, FileText, Plus, Search, Users } from 'lucide-react';
import { persist, useWorkspace } from '../state/workspace-context';
import {
  availableProjects,
  canManageProject,
  canViewProject,
  formatDate,
  isOverdue,
  localDate,
  offsetDate,
  projectProgress,
} from '../domain/model';
import type { Project } from '../domain/model';
import { saveProject } from '../domain/commands';
import {
  ActionLink,
  Avatar,
  Button,
  Confirm,
  Empty,
  Field,
  NotFound,
  Notice,
  PageHeading,
  Panel,
  Progress,
  Screen,
  Stat,
  Tabs,
} from '../components/ui';
import { TaskTable } from '../components/TaskTable';

export function ProjectCard({ project }: { project: Project }) {
  const { data } = useWorkspace();
  const tasks = data.tasks.filter((t) => t.projectId === project.id);
  const progress = projectProgress(tasks);
  const overdue = tasks.some((t) => isOverdue(t));
  return (
    <Link to={`/app/projects/${project.id}`} className="project-card">
      <div className="project-card-top">
        <span>ПРОЕКТ</span>
        <span
          className={`badge ${project.status === 'archived' ? 'status-new' : project.status === 'completed' ? 'status-done' : overdue ? 'status-in_review' : 'status-in_progress'}`}
        >
          {project.status === 'archived'
            ? 'Архив'
            : project.status === 'completed'
              ? 'Завершён'
              : overdue
                ? 'Нужен контроль'
                : 'В работе'}
        </span>
      </div>
      <h2>{project.name}</h2>
      <p>Заказчик: {data.clients.find((c) => c.id === project.clientId)?.name ?? 'Не указан'}</p>
      <Progress value={progress} />
      <div className="project-card-bottom">
        <span>
          {tasks.filter((t) => t.status === 'done').length} / {tasks.length} задач · {progress}%
        </span>
        <span>До {formatDate(project.dueDate)}</span>
      </div>
      <div className="project-card-people">
        <div className="avatar-stack">
          {project.memberIds.slice(0, 3).map((id) => (
            <Avatar key={id} name={data.users.find((u) => u.id === id)?.name ?? '?'} size="small" />
          ))}
        </div>
        <ArrowRight size={18} />
      </div>
    </Link>
  );
}
export function Projects() {
  const { data, user } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [client, setClient] = useState('');
  if (!user) return null;
  const projects = availableProjects(data, user);
  const tab = params.get('tab') ?? 'active';
  const activeTasks = data.tasks.filter((t) =>
    projects.some((p) => p.id === t.projectId && p.status === 'active'),
  );
  const shown = projects.filter(
    (p) =>
      p.status === tab &&
      (!client || p.clientId === client) &&
      p.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  return (
    <Screen>
      <PageHeading
        title={tab === 'archived' ? 'Архив проектов' : 'Проекты'}
        description="От первого поручения до принятого результата."
        action={
          user.role === 'manager' && (
            <ActionLink to="/app/projects/new">
              <Plus size={18} />
              Создать проект
            </ActionLink>
          )
        }
      />
      <div className="stats-row">
        <Stat
          value={projects.filter((p) => p.status === 'active').length}
          label="Активных проектов"
        />
        <Stat
          value={activeTasks.filter((t) => t.status === 'in_progress').length}
          label="Задач в работе"
        />
        <Stat
          value={activeTasks.filter((t) => isOverdue(t)).length}
          label="Просроченных задач"
          accent
        />
      </div>
      <div className="filter-toolbar">
        <Tabs
          options={[
            { value: 'active', label: 'Активные' },
            { value: 'completed', label: 'Завершённые' },
            { value: 'archived', label: 'Архив' },
          ]}
          value={tab}
          onChange={(value) => setParams({ tab: value })}
        />
        <div className="filter-inputs">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Поиск проектов"
              placeholder="Поиск по названию проекта"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Заказчик проекта"
            value={client}
            onChange={(e) => setClient(e.target.value)}
          >
            <option value="">Все заказчики</option>
            {data.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {shown.length ? (
        <div className="projects-grid">
          {shown.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <Empty
          title="Проекты не найдены"
          description={
            query || client
              ? 'Попробуйте изменить поиск или фильтр.'
              : 'В этом разделе пока нет проектов.'
          }
          action={
            user.role === 'manager' && (
              <ActionLink to="/app/projects/new">Создать проект</ActionLink>
            )
          }
        />
      )}
    </Screen>
  );
}
export function ProjectForm() {
  const { id } = useParams();
  const { data, user, transact, busy, server } = useWorkspace();
  const navigate = useNavigate();
  const project = data.projects.find((p) => p.id === id);
  if (!user) return null;
  if (user.role !== 'manager' || (id && (!project || !canManageProject(user, project))))
    return <NotFound forbidden />;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input = {
      name: String(f.get('name')),
      description: String(f.get('description')),
      clientId: String(f.get('clientId')),
      managerId: user?.id ?? '',
      memberIds: f.getAll('members').map(String),
      startDate: String(f.get('startDate')),
      dueDate: String(f.get('dueDate')),
      status: (f.get('status') ?? 'active') as Project['status'],
    };
    const ok = await persist(
      { server, transact },
      {
        action: 'project',
        id,
        data: {
          name: input.name,
          description: input.description,
          customer: input.clientId,
          members: input.memberIds.filter((member) => member !== user?.id),
          start_date: input.startDate || null,
          due_date: input.dueDate || null,
          is_archived: input.status === 'archived',
          is_completed: input.status === 'completed',
        },
      },
      (d, a) => saveProject(d, a, input, id),
      id ? 'Проект обновлён.' : 'Проект создан.',
    );
    if (ok) navigate(id ? `/app/projects/${id}` : '/app/projects');
  }
  return (
    <Screen>
      <PageHeading
        title={id ? 'Редактирование проекта' : 'Создание проекта'}
        description="Сначала определите цель, участников и срок."
        back={id ? `/app/projects/${id}` : '/app/projects'}
      />
      <form onSubmit={(e) => void submit(e)} className="form-layout">
        <Panel title="Основные сведения">
          <Field label="Название проекта" required>
            <input
              name="name"
              required
              minLength={3}
              maxLength={120}
              defaultValue={project?.name}
            />
          </Field>
          <Field label="Описание">
            <textarea
              name="description"
              rows={4}
              maxLength={5000}
              defaultValue={project?.description}
              placeholder="Что нужно сделать и какой результат ожидается"
            />
          </Field>
          <div className="form-grid">
            <Field label="Заказчик" required>
              <select name="clientId" defaultValue={project?.clientId ?? ''} required>
                <option value="" disabled>
                  Выберите заказчика
                </option>
                {data.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Руководитель">
              <input readOnly value={user.name} />
            </Field>
            <Field label="Дата начала" required>
              <input
                name="startDate"
                type="date"
                defaultValue={project?.startDate ?? localDate()}
                required
              />
            </Field>
            <Field label="Дата окончания" required>
              <input
                name="dueDate"
                type="date"
                defaultValue={project?.dueDate ?? offsetDate(14)}
                required
              />
            </Field>
          </div>
          {id && (
            <Field label="Статус проекта">
              <select name="status" defaultValue={project?.status}>
                <option value="active">Активный</option>
                <option value="completed">Завершённый</option>
                <option value="archived">Архив</option>
              </select>
            </Field>
          )}
          <div className="form-actions">
            <ActionLink secondary to={id ? `/app/projects/${id}` : '/app/projects'}>
              Отмена
            </ActionLink>
            <Button type="submit" disabled={busy}>
              {busy ? 'Сохраняем…' : id ? 'Сохранить изменения' : 'Создать проект'}
            </Button>
          </div>
        </Panel>
        <Panel title="Участники проекта">
          <p className="muted">Выбранным сотрудникам можно назначать задачи проекта.</p>
          <div className="checkbox-list">
            {data.users
              .filter((u) => u.active && u.role !== 'admin')
              .map((u) => (
                <label key={u.id}>
                  <input
                    type="checkbox"
                    name="members"
                    value={u.id}
                    defaultChecked={project ? project.memberIds.includes(u.id) : u.id === user.id}
                    disabled={u.id === user.id}
                  />
                  <Avatar name={u.name} />
                  <span>
                    {u.name}
                    <small>{u.position}</small>
                  </span>
                </label>
              ))}
          </div>
          <Notice>Руководитель добавляется в состав проекта автоматически.</Notice>
        </Panel>
      </form>
    </Screen>
  );
}
export function ProjectDetail() {
  const { id } = useParams();
  const { data, user, transact, busy, server } = useWorkspace();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [confirm, setConfirm] = useState(false);
  const project = data.projects.find((p) => p.id === id);
  if (!user) return null;
  if (!project || !canViewProject(user, project)) return <NotFound forbidden />;
  const manage = canManageProject(user, project);
  const wholeProjectTasks = data.tasks.filter((t) => t.projectId === id);
  const tasks = data.tasks.filter(
    (t) => t.projectId === id && (manage || t.assigneeId === user.id),
  );
  const tab = params.get('tab') ?? 'tasks';
  const client = data.clients.find((c) => c.id === project.clientId);
  return (
    <Screen>
      <PageHeading
        title={project.name}
        description={project.description}
        back="/app/projects"
        action={
          manage && (
            <>
              <ActionLink secondary to={`/app/projects/${id}/edit`}>
                Редактировать
              </ActionLink>
              {project.status === 'active' && (
                <ActionLink to={`/app/tasks/new?project=${id}`}>
                  <Plus size={18} />
                  Создать задачу
                </ActionLink>
              )}
            </>
          )
        }
      />
      <div className="project-summary">
        <div>
          <span className="muted">Прогресс проекта</span>
          <strong>{projectProgress(wholeProjectTasks)}%</strong>
          <Progress value={projectProgress(wholeProjectTasks)} />
        </div>
        <span>
          <CalendarDays size={18} />
          {formatDate(project.startDate)} — {formatDate(project.dueDate)}
        </span>
        <span>
          <Users size={18} />
          {project.memberIds.length} участника
        </span>
        <span className="badge status-new">
          {project.status === 'archived'
            ? 'В архиве'
            : project.status === 'completed'
              ? 'Завершён'
              : 'Активный'}
        </span>
      </div>
      <Tabs
        options={[
          { value: 'tasks', label: 'Задачи' },
          { value: 'about', label: 'О проекте' },
          { value: 'members', label: 'Участники' },
        ]}
        value={tab}
        onChange={(value) => setParams({ tab: value })}
      />
      {tab === 'tasks' ? (
        <>
          <div className="view-links">
            <Link to={`/app/tasks?project=${id}`}>Список задач</Link>
            <Link to={`/app/board?project=${id}`}>Kanban-доска</Link>
            <Link to={`/app/calendar?project=${id}`}>Календарь</Link>
          </div>
          <TaskTable tasks={tasks} />
        </>
      ) : tab === 'about' ? (
        <div className="two-columns">
          <Panel title="Сведения о проекте">
            <dl className="details">
              <div>
                <dt>Заказчик</dt>
                <dd>
                  {manage && client ? (
                    <Link to={`/app/clients/${client?.id}`}>{client?.name}</Link>
                  ) : (
                    client?.name
                  )}
                </dd>
              </div>
              <div>
                <dt>Руководитель</dt>
                <dd>{data.users.find((u) => u.id === project.managerId)?.name}</dd>
              </div>
              <div>
                <dt>Срок</dt>
                <dd>{formatDate(project.dueDate)}</dd>
              </div>
              <div>
                <dt>Описание</dt>
                <dd>{project.description}</dd>
              </div>
            </dl>
          </Panel>
          <Panel title="Управление проектом">
            <FileText size={26} />
            <p>После приёмки всех задач проект можно завершить и переместить в архив.</p>
            {manage ? (
              <Button disabled={busy} onClick={() => setConfirm(true)}>
                {project.status === 'archived' ? 'Вернуть в активные' : 'Завершить и архивировать'}
              </Button>
            ) : (
              <Notice>Завершением проекта управляет руководитель.</Notice>
            )}
          </Panel>
        </div>
      ) : (
        <Panel title="Участники">
          <div className="member-list">
            {project.memberIds.map((id) => {
              const member = data.users.find((u) => u.id === id);
              return (
                member && (
                  <div key={id}>
                    <Avatar name={member.name} />
                    <div>
                      <strong>{member.name}</strong>
                      <p>{member.position}</p>
                    </div>
                    <span className="badge status-new">
                      {id === project.managerId ? 'Руководитель' : 'Участник'}
                    </span>
                  </div>
                )
              );
            })}
          </div>
        </Panel>
      )}
      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title={project.status === 'archived' ? 'Восстановить проект?' : 'Завершить проект?'}
        description={
          project.status === 'archived'
            ? 'Проект снова появится в списке активных.'
            : 'Все задачи должны быть приняты. Проект и его история останутся доступны в архиве.'
        }
        onConfirm={() => {
          void persist(
            { server, transact },
            {
              action: 'project',
              id: project.id,
              data: { is_archived: project.status !== 'archived', is_completed: false },
            },
            (d, a) =>
              saveProject(
                d,
                a,
                { ...project, status: project.status === 'archived' ? 'active' : 'archived' },
                project.id,
              ),
            'Статус проекта обновлён.',
          ).then((ok) => {
            if (ok) {
              setConfirm(false);
              navigate('/app/projects');
            }
          });
        }}
        busy={busy}
      />
    </Screen>
  );
}
