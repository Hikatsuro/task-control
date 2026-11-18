import { z } from 'zod';

export const roles = ['admin', 'manager', 'employee'] as const;
export const statuses = ['new', 'in_progress', 'in_review', 'done'] as const;
export const priorities = ['low', 'medium', 'high'] as const;
export const roleLabels = {
  admin: 'Администратор',
  manager: 'Руководитель',
  employee: 'Сотрудник',
};
export const statusLabels = {
  new: 'Новая',
  in_progress: 'В работе',
  in_review: 'На проверке',
  done: 'Выполнена',
};
export const priorityLabels = { low: 'Низкий', medium: 'Средний', high: 'Высокий' };
export type Role = (typeof roles)[number];
export type Status = (typeof statuses)[number];
export type Priority = (typeof priorities)[number];

const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(roles),
  departmentId: z.string(),
  active: z.boolean(),
  position: z.string(),
});
const clientSchema = z.object({
  id: z.string(),
  name: z.string(),
  contact: z.string(),
  email: z.string(),
  phone: z.string(),
  notes: z.string(),
});
const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  clientId: z.string(),
  managerId: z.string(),
  memberIds: z.array(z.string()),
  startDate: z.string(),
  dueDate: z.string(),
  status: z.enum(['active', 'completed', 'archived']),
});
const activitySchema = z.object({
  id: z.string(),
  authorId: z.string(),
  text: z.string(),
  createdAt: z.string(),
});
const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  authorId: z.string(),
  createdAt: z.string(),
});
const taskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  description: z.string(),
  assigneeId: z.string(),
  status: z.enum(statuses),
  priority: z.enum(priorities),
  dueDate: z.string(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  comments: z.array(activitySchema),
  activity: z.array(activitySchema),
  attachments: z.array(attachmentSchema),
});
const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  body: z.string(),
  taskId: z.string().optional(),
  read: z.boolean(),
  createdAt: z.string(),
});
export const workspaceSchema = z.object({
  version: z.literal(1),
  users: z.array(userSchema),
  clients: z.array(clientSchema),
  projects: z.array(projectSchema),
  tasks: z.array(taskSchema),
  departments: z.array(z.object({ id: z.string(), name: z.string(), description: z.string() })),
  notifications: z.array(notificationSchema),
  settings: z.object({
    name: z.string(),
    description: z.string(),
    notifications: z.record(z.string(), z.boolean()),
    reducedMotion: z.boolean(),
  }),
  subscription: z.object({ plan: z.enum(['basic', 'pro']), expiresAt: z.string().nullable() }),
});
export type Workspace = z.infer<typeof workspaceSchema>;
export type User = z.infer<typeof userSchema>;
export type Client = z.infer<typeof clientSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type ProjectInput = Omit<Project, 'id'>;
export type TaskInput = Pick<
  Task,
  'title' | 'description' | 'projectId' | 'assigneeId' | 'priority' | 'dueDate'
>;

export class DomainError extends Error {}
export function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new DomainError(message);
}
export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function offsetDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDate(d);
}
export function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return value
    ? new Intl.DateTimeFormat('ru-RU', options ?? { day: 'numeric', month: 'short' }).format(
        new Date(value.length === 10 ? `${value}T12:00:00` : value),
      )
    : 'Без срока';
}
export function isOverdue(task: Task, now = localDate()) {
  return task.status !== 'done' && !!task.dueDate && task.dueDate < now;
}
export function canViewProject(user: User, project: Project) {
  return project.managerId === user.id || project.memberIds.includes(user.id);
}
export function canManageProject(user: User, project: Project) {
  return user.role === 'manager' && project.managerId === user.id;
}
export function canViewTask(user: User, task: Task, project: Project) {
  return (
    canViewProject(user, project) &&
    (canManageProject(user, project) || task.assigneeId === user.id)
  );
}
export function availableProjects(data: Workspace, user: User) {
  return data.projects.filter((p) => canViewProject(user, p));
}
export function availableTasks(data: Workspace, user: User) {
  return data.tasks.filter((t) => {
    const p = data.projects.find((p) => p.id === t.projectId);
    return p && canViewTask(user, t, p);
  });
}
export function projectProgress(tasks: Task[]) {
  return tasks.length
    ? Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100)
    : 0;
}
export function shouldNotify(data: Workspace, userId: string, category: string) {
  return data.settings.notifications[`${userId}:${category}`] !== false;
}
export function withDeadlineReminders(data: Workspace, today = localDate()): Workspace {
  const nextDay = new Date(`${today}T12:00:00`);
  nextDay.setDate(nextDay.getDate() + 1);
  const tomorrow = localDate(nextDay);
  const reminders: Workspace['notifications'] = [];
  for (const task of data.tasks) {
    const project = data.projects.find((p) => p.id === task.projectId);
    if (
      !project ||
      project.status !== 'active' ||
      task.status === 'done' ||
      !task.dueDate ||
      task.dueDate > tomorrow
    )
      continue;
    for (const userId of new Set([task.assigneeId, project.managerId])) {
      const id = `deadline:${today}:${task.id}:${userId}`;
      if (!shouldNotify(data, userId, 'deadline') || data.notifications.some((n) => n.id === id))
        continue;
      reminders.push({
        id,
        userId,
        title:
          task.dueDate < today
            ? 'Срок задачи истёк'
            : task.dueDate === today
              ? 'Задача со сроком на сегодня'
              : 'Срок задачи завтра',
        body: task.title,
        taskId: task.id,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  }
  return reminders.length
    ? { ...data, notifications: [...reminders, ...data.notifications] }
    : data;
}
export function assertTaskAccess(data: Workspace, user: User, id: string) {
  const task = data.tasks.find((t) => t.id === id);
  const project = data.projects.find((p) => p.id === task?.projectId);
  requireCondition(
    task && project && canViewTask(user, task, project),
    'Задача недоступна для выбранного профиля.',
  );
  return { task, project };
}
export function nextStatuses(user: User, task: Task, project: Project): Status[] {
  if (project.status !== 'active' || !canViewTask(user, task, project)) return [];
  if (canManageProject(user, project))
    return (
      {
        new: ['in_progress'],
        in_progress: ['in_review'],
        in_review: ['done', 'in_progress'],
        done: ['in_progress'],
      } as Record<Status, Status[]>
    )[task.status];
  return task.assigneeId === user.id
    ? task.status === 'new'
      ? ['in_progress']
      : task.status === 'in_progress'
        ? ['in_review']
        : []
    : [];
}
export function transition(
  data: Workspace,
  user: User,
  id: string,
  status: Status,
  reason = '',
): Workspace {
  const { task, project } = assertTaskAccess(data, user, id);
  requireCondition(project.status === 'active', 'Изменять задачи можно только в активном проекте.');
  requireCondition(task.status !== status, 'Этот статус уже установлен.');
  requireCondition(
    nextStatuses(user, task, project).includes(status),
    'Этот переход недоступен. Выполненную работу принимает руководитель.',
  );
  if (task.status === 'in_review' && status === 'in_progress')
    requireCondition(reason.trim().length >= 3, 'Укажите причину возврата на доработку.');
  const now = new Date().toISOString();
  const activity: Activity = {
    id: newId('event'),
    authorId: user.id,
    text: `${statusLabels[task.status]} → ${statusLabels[status]}${reason.trim() ? `. ${reason.trim()}` : ''}`,
    createdAt: now,
  };
  const recipient = status === 'in_review' ? project.managerId : task.assigneeId;
  const send = shouldNotify(
    data,
    recipient,
    status === 'in_review' || task.status === 'in_review' ? 'review' : 'changes',
  );
  return {
    ...data,
    tasks: data.tasks.map((t) =>
      t.id === id
        ? {
            ...t,
            status,
            completedAt: status === 'done' ? now : null,
            activity: [...t.activity, activity],
          }
        : t,
    ),
    notifications: send
      ? [
          {
            id: newId('notification'),
            userId: recipient,
            title:
              status === 'in_review'
                ? 'Задача ожидает проверки'
                : status === 'done'
                  ? 'Работа принята'
                  : 'Статус задачи изменён',
            body: task.title,
            taskId: id,
            read: false,
            createdAt: now,
          },
          ...data.notifications,
        ]
      : data.notifications,
  };
}
export function validateTaskInput(data: Workspace, user: User, input: TaskInput) {
  const project = data.projects.find((p) => p.id === input.projectId);
  requireCondition(
    project && canManageProject(user, project),
    'Создавать и редактировать задачи может руководитель проекта.',
  );
  requireCondition(project.status === 'active', 'Проект не активен.');
  requireCondition(
    input.title.trim().length >= 3,
    'Название должно содержать не меньше 3 символов.',
  );
  const assignee = data.users.find((u) => u.id === input.assigneeId && u.active);
  requireCondition(
    assignee && (project.memberIds.includes(assignee.id) || project.managerId === assignee.id),
    'Выберите активного участника проекта.',
  );
  requireCondition(
    !input.dueDate || (input.dueDate >= project.startDate && input.dueDate <= project.dueDate),
    'Срок задачи должен попадать в период проекта.',
  );
}
