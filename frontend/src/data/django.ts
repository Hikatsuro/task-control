export type ServerUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  department: number | null;
  position: string;
  is_active: boolean;
  role: 'admin' | 'manager' | 'employee';
};
export type ServerProject = {
  id: number;
  name: string;
  description: string;
  customer: number;
  manager: number;
  members: number[];
  is_archived: boolean;
  is_completed: boolean;
  start_date: string | null;
  due_date: string | null;
};
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type ServerTask = {
  id: number;
  project: number;
  title: string;
  description: string;
  status: TaskStatus;
  assignee: number | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  completed_at: string | null;
  events: { id: number; author: number; text: string; created_at: string }[];
  comments: ServerTask['events'];
  attachments: {
    id: number;
    author: number;
    name: string;
    size: number;
    content_type: string;
    created_at: string;
  }[];
};
export type ServerWorkspace = {
  user: ServerUser;
  users: ServerUser[];
  customers: {
    id: number;
    name: string;
    contact: string;
    email: string;
    phone: string;
    notes: string;
  }[];
  projects: ServerProject[];
  tasks: ServerTask[];
  departments: { id: number; name: string; description: string }[];
  notifications: {
    id: number;
    task_id: number | null;
    title: string;
    body: string;
    read: boolean;
    created_at: string;
  }[];
  settings: { name: string; description: string };
  preferences: Record<string, boolean>;
};

export type WorkspaceCommand = {
  action:
    | 'project'
    | 'customer'
    | 'user'
    | 'department'
    | 'profile'
    | 'password'
    | 'settings'
    | 'preferences'
    | 'notification'
    | 'notifications'
    | 'comment'
    | 'delete-comment';
  id?: string;
  task?: string;
  data?: Record<string, unknown>;
};
export class DjangoError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  return send<T>(path, { signal });
}

export async function write<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  data?: object,
): Promise<T> {
  const { csrf_token } = await request<{ csrf_token: string }>('/auth/csrf/');
  const multipart = data instanceof FormData;
  return send<T>(path, {
    method,
    headers: {
      'X-CSRFToken': csrf_token,
      ...(!multipart && { 'Content-Type': 'application/json' }),
    },
    body: multipart ? data : data ? JSON.stringify(data) : undefined,
  });
}

async function send<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, credentials: 'same-origin' });
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const detail =
      typeof data === 'object' && data !== null ? Object.values(data).flat().join(' ') : '';
    throw new DjangoError(response.status, detail || `Ошибка сервера (${response.status}).`);
  }
  return !response.headers.get('content-type')?.includes('application/json')
    ? (undefined as T)
    : (response.json() as Promise<T>);
}
