import {
  assertTaskAccess,
  canManageProject,
  newId,
  requireCondition,
  shouldNotify,
  validateTaskInput,
} from './model';
import type { Attachment, Client, ProjectInput, TaskInput, User, Workspace } from './model';

export function saveTask(data: Workspace, actor: User, input: TaskInput, id?: string): Workspace {
  validateTaskInput(data, actor, input);
  const existing = id ? assertTaskAccess(data, actor, id).task : null;
  requireCondition(
    !existing || existing.projectId === input.projectId,
    'Перенос задачи в другой проект пока не поддерживается.',
  );
  const now = new Date().toISOString();
  const activity = {
    id: newId('event'),
    authorId: actor.id,
    text: existing ? 'Обновлены сведения о задаче' : 'Задача создана и назначен исполнитель',
    createdAt: now,
  };
  const task = existing
    ? {
        ...existing,
        ...input,
        title: input.title.trim(),
        activity: [...existing.activity, activity],
      }
    : {
        ...input,
        title: input.title.trim(),
        id: newId('task'),
        status: 'new' as const,
        completedAt: null,
        createdAt: now,
        activity: [activity],
        comments: [],
        attachments: [],
      };
  const reassigned = !existing || existing.assigneeId !== task.assigneeId;
  const changedAssignee = reassigned && shouldNotify(data, task.assigneeId, 'assignment');
  const changedTask =
    !!existing &&
    !reassigned &&
    task.assigneeId !== actor.id &&
    shouldNotify(data, task.assigneeId, 'changes');
  return {
    ...data,
    tasks: existing ? data.tasks.map((t) => (t.id === id ? task : t)) : [task, ...data.tasks],
    notifications:
      changedAssignee || changedTask
        ? [
            {
              id: newId('notification'),
              userId: task.assigneeId,
              title: changedAssignee ? 'Вам назначена задача' : 'Сведения о задаче обновлены',
              body: task.title,
              taskId: task.id,
              read: false,
              createdAt: now,
            },
            ...data.notifications,
          ]
        : data.notifications,
  };
}
export function saveProject(
  data: Workspace,
  actor: User,
  input: ProjectInput,
  id?: string,
): Workspace {
  requireCondition(actor.role === 'manager', 'Управлять проектами может руководитель.');
  const existing = data.projects.find((p) => p.id === id);
  requireCondition(
    !id || (existing && canManageProject(actor, existing)),
    'Нет прав на редактирование проекта.',
  );
  requireCondition(
    input.name.trim().length >= 3,
    'Название проекта должно содержать не меньше 3 символов.',
  );
  requireCondition(
    input.managerId === actor.id,
    'Руководитель может создавать проекты под своим управлением.',
  );
  requireCondition(
    data.clients.some((c) => c.id === input.clientId),
    'Выберите заказчика.',
  );
  requireCondition(
    input.startDate && input.dueDate && input.startDate <= input.dueDate,
    'Проверьте даты начала и окончания проекта.',
  );
  requireCondition(
    input.memberIds.every((id) => data.users.some((u) => u.id === id && u.active)),
    'В проект можно добавить только активные профили.',
  );
  const tasks = data.tasks.filter((t) => t.projectId === id);
  requireCondition(
    tasks
      .filter((t) => t.status !== 'done')
      .every((t) => t.assigneeId === actor.id || input.memberIds.includes(t.assigneeId)),
    'Нельзя убрать участника, у которого есть незавершённые задачи проекта. Сначала переназначьте их.',
  );
  requireCondition(
    tasks.every((t) => !t.dueDate || (t.dueDate >= input.startDate && t.dueDate <= input.dueDate)),
    'В новый период проекта должны попадать сроки всех существующих задач.',
  );
  if (input.status !== 'active')
    requireCondition(
      data.tasks.filter((t) => t.projectId === id).every((t) => t.status === 'done'),
      'Сначала примите все задачи проекта.',
    );
  const project = {
    ...input,
    id: id ?? newId('project'),
    name: input.name.trim(),
    memberIds: [...new Set([...input.memberIds, actor.id])],
  };
  return {
    ...data,
    projects: id
      ? data.projects.map((p) => (p.id === id ? project : p))
      : [project, ...data.projects],
  };
}
export function saveClient(
  data: Workspace,
  actor: User,
  input: Omit<Client, 'id'>,
  id?: string,
): Workspace {
  requireCondition(actor.role === 'manager', 'Управлять заказчиками может руководитель.');
  requireCondition(input.name.trim().length >= 2, 'Укажите название заказчика.');
  const client = { ...input, id: id ?? newId('client'), name: input.name.trim() };
  return {
    ...data,
    clients: id ? data.clients.map((c) => (c.id === id ? client : c)) : [client, ...data.clients],
  };
}
export function saveUser(
  data: Workspace,
  actor: User,
  input: Omit<User, 'id'>,
  id?: string,
): Workspace {
  requireCondition(actor.role === 'admin', 'Управлять пользователями может администратор.');
  requireCondition(
    input.username.trim().length >= 3 && input.name.trim(),
    'Укажите имя и логин не короче 3 символов.',
  );
  requireCondition(
    !data.users.some(
      (u) => u.id !== id && u.username.toLowerCase() === input.username.toLowerCase(),
    ),
    'Этот логин уже занят.',
  );
  requireCondition(
    id !== actor.id || (input.active && input.role === 'admin'),
    'Нельзя заблокировать себя или снять собственную роль администратора.',
  );
  requireCondition(
    input.role === 'manager' ||
      !data.projects.some((p) => p.managerId === id && p.status === 'active'),
    'Сначала передайте или завершите активные проекты руководителя.',
  );
  const user = {
    ...input,
    username: input.username.trim(),
    name: input.name.trim(),
    id: id ?? newId('user'),
  };
  return {
    ...data,
    users: id ? data.users.map((u) => (u.id === id ? user : u)) : [...data.users, user],
  };
}
export function addComment(data: Workspace, actor: User, taskId: string, text: string): Workspace {
  const { task, project } = assertTaskAccess(data, actor, taskId);
  requireCondition(
    text.trim().length > 0 && text.length <= 5000,
    'Комментарий должен содержать от 1 до 5000 символов.',
  );
  const comment = {
    id: newId('comment'),
    authorId: actor.id,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  const recipients = [...new Set([project.managerId, task.assigneeId])].filter(
    (id) => id !== actor.id && shouldNotify(data, id, 'comments'),
  );
  return {
    ...data,
    tasks: data.tasks.map((t) =>
      t.id === taskId ? { ...t, comments: [...t.comments, comment] } : t,
    ),
    notifications: [
      ...recipients.map((userId) => ({
        id: newId('notification'),
        userId,
        title: 'Новый комментарий',
        body: task.title,
        taskId,
        read: false,
        createdAt: comment.createdAt,
      })),
      ...data.notifications,
    ],
  };
}
export function removeComment(
  data: Workspace,
  actor: User,
  taskId: string,
  commentId: string,
): Workspace {
  const { task } = assertTaskAccess(data, actor, taskId);
  requireCondition(
    task.comments.some((c) => c.id === commentId && c.authorId === actor.id),
    'Удалить можно только собственный комментарий.',
  );
  return {
    ...data,
    tasks: data.tasks.map((t) =>
      t.id === taskId ? { ...t, comments: t.comments.filter((c) => c.id !== commentId) } : t,
    ),
  };
}
export function addAttachment(
  data: Workspace,
  actor: User,
  taskId: string,
  attachment: Attachment,
): Workspace {
  assertTaskAccess(data, actor, taskId);
  requireCondition(attachment.authorId === actor.id, 'Автор вложения не совпадает с профилем.');
  return {
    ...data,
    tasks: data.tasks.map((t) =>
      t.id === taskId ? { ...t, attachments: [...t.attachments, attachment] } : t,
    ),
  };
}
export function removeAttachment(
  data: Workspace,
  actor: User,
  taskId: string,
  attachmentId: string,
): Workspace {
  const { task } = assertTaskAccess(data, actor, taskId);
  requireCondition(
    task.attachments.some((a) => a.id === attachmentId && a.authorId === actor.id),
    'Удалить можно только собственное вложение.',
  );
  return {
    ...data,
    tasks: data.tasks.map((t) =>
      t.id === taskId
        ? { ...t, attachments: t.attachments.filter((a) => a.id !== attachmentId) }
        : t,
    ),
  };
}
