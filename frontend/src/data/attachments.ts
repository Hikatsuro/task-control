import { clear, createStore, del, get, set } from 'idb-keyval';

const files = createStore('taskcontrol-files-v1', 'attachments');
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const attachmentRepository = {
  save: (id: string, file: Blob) => set(id, file, files),
  read: (id: string) => get<Blob>(id, files),
  remove: (id: string) => del(id, files),
  clear: () => clear(files),
};
