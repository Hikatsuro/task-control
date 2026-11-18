import { createContext, useContext } from 'react';
import type { Workspace, User } from '../domain/model';

export type Toast = { id: number; text: string; tone: 'success' | 'error' | 'info' };
export interface WorkspaceContextValue {
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
export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('WorkspaceProvider отсутствует.');
  return value;
}
