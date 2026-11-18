import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  DjangoError,
  request,
  write,
  type ServerTask,
  type ServerWorkspace,
  type TaskStatus,
} from '../data/django';
import type { Status, Task, User, Workspace } from '../domain/model';
import { WorkspaceContext, type Toast } from './workspace-context';

const statuses: Record<TaskStatus, Status> = {
  todo: 'new',
  in_progress: 'in_progress',
  review: 'in_review',
  done: 'done',
};
const apiStatuses: Record<Status, TaskStatus> = {
  new: 'todo',
  in_progress: 'in_progress',
  in_review: 'review',
  done: 'done',
};
const empty: Workspace = {
  version: 1,
  users: [],
  projects: [],
  clients: [],
  tasks: [],
  departments: [],
  notifications: [],
  settings: { name: 'TaskControl', description: '', notifications: {}, reducedMotion: false },
  subscription: { plan: 'basic', expiresAt: null },
};

function adapt(snapshot: ServerWorkspace): Workspace {
  return {
    ...empty,
    users: snapshot.users.map((item): User => ({
      id: String(item.id),
      username: item.username,
      name: [item.first_name, item.last_name].filter(Boolean).join(' ') || item.username,
      email: item.email,
      role: item.role,
      departmentId: item.department === null ? '' : String(item.department),
      active: item.is_active,
      position: item.position,
    })),
    clients: snapshot.customers.map((item) => ({
      ...item,
      id: String(item.id),
    })),
    projects: snapshot.projects.map((item) => ({
      id: String(item.id),
      name: item.name,
      description: item.description,
      clientId: String(item.customer),
      managerId: String(item.manager),
      startDate: item.start_date ?? '',
      dueDate: item.due_date ?? '',
      status: item.is_archived ? 'archived' : item.is_completed ? 'completed' : 'active',
      memberIds: [...new Set([item.manager, ...item.members])].map(String),
    })),
    tasks: snapshot.tasks.map(adaptTask),
    departments: snapshot.departments.map((item) => ({ ...item, id: String(item.id) })),
    notifications: snapshot.notifications.map((item) => ({
      id: String(item.id),
      userId: String(snapshot.user.id),
      taskId: item.task_id === null ? undefined : String(item.task_id),
      title: item.title,
      body: item.body,
      read: item.read,
      createdAt: item.created_at,
    })),
    settings: {
      ...snapshot.settings,
      reducedMotion: false,
      notifications: Object.fromEntries(
        Object.entries(snapshot.preferences).map(([key, value]) => [
          `${snapshot.user.id}:${key}`,
          value,
        ]),
      ),
    },
  };
}

function adaptTask(item: ServerTask): Task {
  return {
    id: String(item.id),
    projectId: String(item.project),
    title: item.title,
    description: item.description,
    assigneeId: item.assignee === null ? '' : String(item.assignee),
    status: statuses[item.status],
    priority: item.priority,
    dueDate: item.due_date ?? '',
    createdAt: item.created_at,
    completedAt: item.completed_at,
    attachments: item.attachments.map((file) => ({
      id: String(file.id),
      authorId: String(file.author),
      name: file.name,
      size: file.size,
      type: file.content_type,
      createdAt: file.created_at,
    })),
    comments: item.comments.map((comment) => ({
      id: String(comment.id),
      authorId: String(comment.author),
      text: comment.text,
      createdAt: comment.created_at,
    })),
    activity: item.events.map((event) => ({
      id: String(event.id),
      authorId: String(event.author),
      text: event.text,
      createdAt: event.created_at,
    })),
  };
}

function errorMessage(error: unknown) {
  return error instanceof DjangoError
    ? error.message
    : 'Не удалось связаться с Django. Проверьте, запущен ли сервер.';
}

export function ServerWorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ data: Workspace; userId: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const inFlight = useRef(false);
  const oldestToast = toasts[0];

  useEffect(() => {
    if (!oldestToast) return;
    const timer = window.setTimeout(
      () => {
        setToasts((items) => items.filter((item) => item.id !== oldestToast.id));
      },
      oldestToast.tone === 'error' ? 9000 : 3500,
    );
    return () => window.clearTimeout(timer);
  }, [oldestToast]);

  function notify(text: string, tone: Toast['tone'] = 'success') {
    setToasts((items) => [...items.slice(-3), { text, tone, id: Date.now() + Math.random() }]);
  }

  async function refresh() {
    const snapshot = await request<ServerWorkspace>('/workspace/');
    setState({ data: adapt(snapshot), userId: String(snapshot.user.id) });
  }

  async function syncAfterWrite() {
    try {
      await refresh();
    } catch {
      notify('Изменение сохранено. Нажмите «Обновить данные», чтобы увидеть результат.', 'info');
    }
  }

  function storeTask(item: ServerTask) {
    const task = adaptTask(item);
    setState((current) => {
      if (!current) return current;
      const tasks = current.data.tasks.some(({ id }) => id === task.id)
        ? current.data.tasks.map((existing) => (existing.id === task.id ? task : existing))
        : [task, ...current.data.tasks];
      return { ...current, data: { ...current.data, tasks } };
    });
  }

  useEffect(() => {
    const controller = new AbortController();
    void request<ServerWorkspace>('/workspace/', controller.signal)
      .then((snapshot) => {
        if (!controller.signal.aborted)
          setState({ data: adapt(snapshot), userId: String(snapshot.user.id) });
      })
      .catch((error: unknown) => {
        if (
          !controller.signal.aborted &&
          !(error instanceof DjangoError && [401, 403].includes(error.status))
        ) {
          setToasts([{ id: Date.now(), tone: 'error', text: errorMessage(error) }]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setReady(true);
      });
    return () => controller.abort();
  }, []);

  async function run(action: () => Promise<void>, success?: string): Promise<boolean> {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    try {
      await action();
      if (success) notify(success);
      return true;
    } catch (error) {
      if (error instanceof DjangoError && error.status === 401) setState(null);
      notify(errorMessage(error), 'error');
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <WorkspaceContext.Provider
      value={{
        data: state?.data ?? empty,
        user: state?.data.users.find((item) => item.id === state.userId) ?? null,
        ready,
        busy,
        error: null,
        toasts,
        notify,
        dismissToast: (id) => setToasts((items) => items.filter((item) => item.id !== id)),
        signIn: () => undefined,
        signOut: () => {
          void run(async () => {
            await write('/auth/logout/', 'POST');
            setToasts([]);
            setState(null);
          });
        },
        transact: async () => {
          notify('Это действие ещё не подключено к Django.', 'info');
          return false;
        },
        resetDemo: async () => undefined,
        server: {
          command: (command, success) =>
            run(async () => {
              await write('/workspace/commands/', 'POST', command);
              await syncAfterWrite();
            }, success),
          upload: (taskId, file) =>
            run(async () => {
              const form = new FormData();
              form.set('file', file);
              await write(`/tasks/${taskId}/files/`, 'POST', form);
              await syncAfterWrite();
            }, 'Файл прикреплён.'),
          removeFile: (taskId, fileId) =>
            run(async () => {
              await write(`/tasks/${taskId}/files/${fileId}/`, 'DELETE');
              await syncAfterWrite();
            }, 'Файл удалён.'),
          refresh: () => run(refresh),
          signIn: (username, password) =>
            run(async () => {
              await write('/auth/login/', 'POST', { username, password });
              await refresh();
            }),
          saveTask: (input, id) =>
            run(
              async () => {
                const payload = {
                  title: input.title.trim(),
                  description: input.description,
                  assignee: Number(input.assigneeId),
                  due_date: input.dueDate || null,
                  priority: input.priority,
                };
                const saved = id
                  ? await write<ServerTask>(`/tasks/${id}/`, 'PATCH', payload)
                  : await write<ServerTask>('/tasks/', 'POST', {
                      ...payload,
                      project: Number(input.projectId),
                    });
                storeTask(saved);
              },
              id ? 'Задача обновлена.' : 'Задача создана.',
            ),
          changeStatus: (id, status, reason) =>
            run(
              async () => {
                const saved = await write<ServerTask>(`/tasks/${id}/`, 'PATCH', {
                  status: apiStatuses[status],
                  ...(reason ? { return_reason: reason } : {}),
                });
                storeTask(saved);
              },
              status === 'done' ? 'Работа принята.' : 'Статус задачи обновлён.',
            ),
        },
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
