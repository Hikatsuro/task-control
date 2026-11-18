import { workspaceSchema } from '../domain/model';
import type { Workspace } from '../domain/model';
import { createSeed } from './seed';

export const STORAGE_KEY = 'taskcontrol.workspace.v1';
export const SESSION_KEY = 'taskcontrol.demo-profile.v1';
export interface WorkspaceRepository {
  load(): Promise<Workspace>;
  save(data: Workspace): Promise<void>;
}
export class StorageError extends Error {}
export const localRepository: WorkspaceRepository = {
  async load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeed();
    const result = workspaceSchema.safeParse(JSON.parse(raw));
    if (!result.success)
      throw new StorageError(
        'Сохранённые данные повреждены или имеют неподдерживаемую версию. Их можно скачать и сбросить через экран восстановления.',
      );
    return result.data;
  },
  async save(data) {
    workspaceSchema.parse(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      throw new StorageError(
        'Не удалось сохранить изменения. Возможно, хранилище браузера заполнено или отключено. Освободите место и повторите действие.',
      );
    }
  },
};
