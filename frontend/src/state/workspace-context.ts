import { createContext, useContext } from 'react';
import type { Workspace, User, TaskInput, Status } from '../domain/model';
import type { WorkspaceCommand } from '../data/django';

export type Toast = { id: number; text: string; tone: 'success' | 'error' | 'info' };
export interface WorkspaceContextValue {
  server?: {
    signIn: (username: string, password: string) => Promise<boolean>;
    saveTask: (input: TaskInput, id?: string) => Promise<boolean>;
    changeStatus: (id: string, status: Status, reason?: string) => Promise<boolean>;
    refresh: () => Promise<boolean>;
    command: (command: WorkspaceCommand, success?: string) => Promise<boolean>;
    upload: (taskId: string, file: File) => Promise<boolean>;
    removeFile: (taskId: string, fileId: string) => Promise<boolean>;
  };
  data: Workspace;
  user: User | null;
  error: string | null;
  ready: boolean;
  busy: boolean;
  toasts: Toast[];
  transact: (fn: (data: Workspace, user: User) => Workspace, success?: string) => Promise<boolean>;
  signIn: (id: string) => void;
  signOut: () => void;
  notify: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  resetDemo: () => Promise<void>;
}

export function persist(
  value: Pick<WorkspaceContextValue, 'server' | 'transact'>,
  command: WorkspaceCommand,
  update: Parameters<WorkspaceContextValue['transact']>[0],
  success?: string,
) {
  return value.server ? value.server.command(command, success) : value.transact(update, success);
}
export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('WorkspaceProvider отсутствует.');
  return value;
}
