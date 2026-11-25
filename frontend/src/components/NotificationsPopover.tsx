import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, BellOff, Check } from 'lucide-react';
import { persist, useWorkspace } from '../state/workspace-context';
import { formatDate } from '../domain/model';

/* The bell opens the latest notifications in place: a popover on desktop, a sheet at the
   bottom on a phone. The full page stays one click away. */

export function NotificationsPopover() {
  const { data, user, transact, server } = useWorkspace();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // Closes on outside click and Escape; links inside close it themselves.
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const mine = data.notifications
    .filter((n) => n.userId === user?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = mine.filter((n) => !n.read).length;

  // When the unread count grows, the badge pops and the bell gives one short ring.
  // Reading notifications lowers the count quietly.
  const [seen, setSeen] = useState(unread);
  const [rings, setRings] = useState(0);
  if (unread !== seen) {
    setSeen(unread);
    if (unread > seen) setRings((n) => n + 1);
  }

  if (!user) return null;
  const shown = (unreadOnly ? mine.filter((n) => !n.read) : mine).slice(0, 6);

  // Django or the browser store, whichever this build works with.
  const markRead = (id?: string) =>
    persist(
      { server, transact },
      id
        ? { action: 'notification', id, data: { read: true } }
        : { action: 'notifications', data: { read: true } },
      (d, a) => ({
        ...d,
        notifications: d.notifications.map((n) =>
          n.userId === a.id && (!id || n.id === id) ? { ...n, read: true } : n,
        ),
      }),
    );

  return (
    <div className="notify" ref={root}>
      <button
        ref={button}
        type="button"
        className="notification-link"
        aria-label={`Уведомления: ${unread} непрочитанных`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell key={`bell-${rings}`} size={18} className={rings ? 'bell-ring' : undefined} />
        {unread > 0 && (
          <span key={`badge-${rings}`} className={rings ? 'badge-pop' : undefined}>
            {unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="notify-backdrop" onClick={() => setOpen(false)} />
          <section className="notify-panel" role="dialog" aria-label="Уведомления">
            <header>
              <h2>Уведомления</h2>
              {unread > 0 && (
                <button type="button" className="notify-readall" onClick={() => void markRead()}>
                  <Check size={14} /> Прочитать все
                </button>
              )}
            </header>
            <div className="notify-tabs" role="group" aria-label="Какие уведомления показать">
              <button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>
                Все
              </button>
              <button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>
                Непрочитанные{unread > 0 && <span>{unread}</span>}
              </button>
            </div>
            {shown.length ? (
              <ul className="notify-list">
                {shown.map((n) => (
                  <li key={n.id} data-unread={!n.read}>
                    <button
                      type="button"
                      onClick={() => {
                        void markRead(n.id);
                        setOpen(false);
                        if (n.taskId) navigate(`/app/tasks/${n.taskId}`);
                      }}
                    >
                      <i aria-hidden="true" />
                      <span>
                        <strong>{n.title}</strong>
                        <small>{n.body}</small>
                        <time dateTime={n.createdAt}>
                          {formatDate(n.createdAt, {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="notify-empty">
                <BellOff size={26} strokeWidth={1.5} />
                <strong>{unreadOnly ? 'Всё прочитано' : 'Уведомлений пока нет'}</strong>
                <span>Здесь появятся назначения, комментарии и решения по задачам.</span>
              </div>
            )}
            <footer>
              <Link to="/app/notifications" onClick={() => setOpen(false)}>
                Все уведомления
              </Link>
            </footer>
          </section>
        </>
      )}
    </div>
  );
}
