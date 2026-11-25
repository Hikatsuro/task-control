import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { CircleAlert, LoaderCircle, RotateCcw, UploadCloud, X } from 'lucide-react';
import type { Task } from '../../domain/model';
import { newId } from '../../domain/model';
import { addAttachment } from '../../domain/commands';
import { attachmentRepository, MAX_FILE_SIZE } from '../../data/attachments';
import { useWorkspace } from '../../state/workspace-context';
import { Button } from '../../components/ui';

/* Upload with visible states: reading (with real progress), saving, error with a retry.
   A finished file moves straight into the task's file list. Files can be dropped on the
   zone or picked; several at once. */

type Item = {
  key: string;
  file: File;
  state: 'reading' | 'saving' | 'error';
  progress: number;
  error?: string;
};

const size = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} КБ`
    : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`;

function readWithProgress(file: File, onProgress: (share: number) => void) {
  return new Promise<Blob>((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    reader.onload = () => resolve(new Blob([reader.result as ArrayBuffer], { type: file.type }));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function AttachmentUploader({
  task,
  onUploaded,
}: {
  task: Task;
  onUploaded?: (attachmentId: string) => void;
}) {
  const { user, transact, busy, server } = useWorkspace();
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const patch = (key: string, change: Partial<Item>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...change } : i)));
  const drop = (key: string) => setItems((list) => list.filter((i) => i.key !== key));

  async function process(key: string, file: File) {
    if (!user) return;
    if (file.size > MAX_FILE_SIZE) {
      patch(key, { state: 'error', error: 'Файл больше 10 МБ' });
      return;
    }
    if (server) {
      // Django stores the bytes; the request reports no progress, only the result.
      patch(key, { state: 'saving', progress: 1, error: undefined });
      if (await server.upload(task.id, file)) drop(key);
      else patch(key, { state: 'error', error: 'Сервер не принял файл' });
      return;
    }
    patch(key, { state: 'reading', progress: 0, error: undefined });
    const id = newId('attachment');
    try {
      const blob = await readWithProgress(file, (share) => patch(key, { progress: share }));
      patch(key, { state: 'saving', progress: 1 });
      await attachmentRepository.save(id, blob);
      const ok = await transact(
        (d, a) =>
          addAttachment(d, a, task.id, {
            id,
            name: file.name,
            size: file.size,
            type: file.type,
            authorId: user.id,
            createdAt: new Date().toISOString(),
          }),
        'Файл прикреплён.',
      );
      if (!ok) {
        await attachmentRepository.remove(id);
        patch(key, { state: 'error', error: 'Не удалось добавить файл к задаче' });
        return;
      }
      // The file now sits in the list below, so the row goes away at once instead of
      // showing the same name twice; the list highlights the new file.
      drop(key);
      onUploaded?.(id);
    } catch {
      patch(key, { state: 'error', error: 'Браузер не смог сохранить файл' });
    }
  }

  function add(files: FileList | null) {
    if (!files?.length) return;
    const fresh = [...files].map((file) => ({
      key: newId('upload'),
      file,
      state: 'reading' as const,
      progress: 0,
    }));
    setItems((list) => [...list, ...fresh]);
    fresh.forEach((item) => void process(item.key, item.file));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    add(e.dataTransfer.files);
  }

  return (
    <div className="uploader">
      <label
        className="dropzone"
        data-over={over}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <UploadCloud size={26} strokeWidth={1.6} aria-hidden="true" />
        <span>
          <b>Перетащите файлы сюда</b> или выберите на компьютере
        </span>
        <small>
          {server
            ? 'До 10 МБ на файл · доступны участникам, которые видят задачу'
            : 'До 10 МБ на файл · сохраняются в этом браузере'}
        </small>
        <input
          ref={input}
          type="file"
          multiple
          aria-label="Добавить файл"
          disabled={busy}
          onChange={(e) => {
            add(e.target.files);
            e.target.value = '';
          }}
        />
      </label>
      {items.length > 0 && (
        <ul className="upload-list" aria-live="polite">
          {items.map((item) => (
            <li key={item.key} data-state={item.state}>
              <span className="upload-icon" aria-hidden="true">
                {item.state === 'error' ? (
                  <CircleAlert size={19} />
                ) : (
                  <LoaderCircle size={19} className="spin" />
                )}
              </span>
              <span className="upload-text">
                <strong>{item.file.name}</strong>
                <small>
                  {item.state === 'reading'
                    ? `Загрузка · ${Math.round(item.progress * 100)}% · ${size(item.file.size)}`
                    : item.state === 'saving'
                      ? 'Сохраняем в задаче…'
                      : item.error}
                </small>
                {(item.state === 'reading' || item.state === 'saving') && (
                  <span className="upload-bar">
                    <i style={{ transform: `scaleX(${item.progress})` }} />
                  </span>
                )}
              </span>
              {item.state === 'error' && (
                <span className="upload-actions">
                  {item.error !== 'Файл больше 10 МБ' && (
                    <Button
                      variant="ghost"
                      aria-label={`Повторить загрузку ${item.file.name}`}
                      onClick={() => void process(item.key, item.file)}
                    >
                      <RotateCcw size={16} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    aria-label={`Убрать ${item.file.name} из списка`}
                    onClick={() => drop(item.key)}
                  >
                    <X size={16} />
                  </Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
