import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { localRepository, SESSION_KEY } from '../data/repository';
import { createSeed } from '../data/seed';
import { attachmentRepository } from '../data/attachments';
import type { User, Workspace } from '../domain/model';
import { withDeadlineReminders } from '../domain/model';
import { WorkspaceContext } from './workspace-context';
import type { Toast } from './workspace-context';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Workspace>(createSeed);
  const current = useRef(data);
  const [profileId, setProfileId] = useState(() => {
    try {
      return localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const queue = useRef(Promise.resolve());
  const mounted = useRef(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    mounted.current = true;
    const activeTimers = timers.current;
    void localRepository
      .load()
      .then(async (value) => {
        const prepared = withDeadlineReminders(value);
        await localRepository.save(prepared);
        if (mounted.current) {
          current.current = prepared;
          setData(prepared);
        }
      })
      .catch((cause) => {
        if (mounted.current)
          setError(
            cause instanceof Error ? cause.message : 'Не удалось прочитать данные браузера.',
          );
      })
      .finally(() => {
        if (mounted.current) setReady(true);
      });
    return () => {
      mounted.current = false;
      activeTimers.forEach(clearTimeout);
    };
  }, []);
  const notify = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items.slice(-3), { id, text, tone }]);
    timers.current.push(
      setTimeout(
        () => {
          if (mounted.current) setToasts((items) => items.filter((t) => t.id !== id));
        },
        tone === 'error' ? 9000 : 4500,
      ),
    );
  }, []);
  const signIn = useCallback(
    (id: string) => {
      const target = current.current.users.find((u) => u.id === id && u.active);
      if (!target) {
        notify('Профиль недоступен или заблокирован.', 'error');
        return;
      }
      try {
        localStorage.setItem(SESSION_KEY, id);
        setProfileId(id);
      } catch {
        notify('Браузер не позволяет сохранить профиль.', 'error');
      }
    },
    [notify],
  );
  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY);
      setProfileId(null);
    } catch {
      notify('Не удалось завершить демосессию.', 'error');
    }
  }, [notify]);
  const transact = useCallback(
    async (fn: (data: Workspace, user: User) => Workspace, success?: string) => {
      setPending((n) => n + 1);
      let ok = false;
      const operation = queue.current.then(async () => {
        try {
          const actor = current.current.users.find((u) => u.id === profileId && u.active);
          if (!actor) throw new Error('Выберите активный демонстрационный профиль.');
          const next = fn(current.current, actor);
          await localRepository.save(next);
          current.current = next;
          setData(next);
          ok = true;
          if (success) notify(success);
        } catch (cause) {
          notify(
            cause instanceof Error ? cause.message : 'Не удалось выполнить действие.',
            'error',
          );
        } finally {
          setPending((n) => n - 1);
        }
      });
      queue.current = operation.catch(() => undefined);
      await operation;
      return ok;
    },
    [profileId, notify],
  );
  const resetDemo = useCallback(async () => {
    try {
      const next = createSeed();
      await localRepository.save(next);
      current.current = next;
      setData(next);
      setError(null);
      localStorage.removeItem(SESSION_KEY);
      setProfileId(null);
      notify('Демонстрационные данные восстановлены.');
      try {
        await attachmentRepository.clear();
      } catch {
        notify(
          'Данные сброшены, но браузер не смог очистить вложения. Их можно удалить через очистку данных сайта.',
          'info',
        );
      }
    } catch {
      notify('Браузер не позволяет сбросить данные.', 'error');
    }
  }, [notify]);
  const user = data.users.find((u) => u.id === profileId && u.active) ?? null;
  return (
    <WorkspaceContext.Provider
      value={{
        data,
        user,
        ready,
        error,
        busy: pending > 0,
        transact,
        signIn,
        signOut,
        notify,
        resetDemo,
        toasts,
        dismissToast: (id) => setToasts((items) => items.filter((t) => t.id !== id)),
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
