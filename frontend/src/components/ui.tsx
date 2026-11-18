import { useEffect, useId, useRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Inbox, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useMotionPreference } from '../state/useMotionPreference';
import { priorityLabels, statusLabels } from '../domain/model';
import type { Priority, Status } from '../domain/model';

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return (
    <button type="button" {...props} className={`button button-${variant} ${className}`}>
      {children}
    </button>
  );
}
export function ActionLink({
  to,
  children,
  secondary = false,
  className = '',
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
  className?: string;
}) {
  return (
    <Link className={`button button-${secondary ? 'secondary' : 'primary'} ${className}`} to={to}>
      {children}
    </Link>
  );
}
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      to="/"
      className={`brand ${light ? 'brand-light' : ''}`}
      aria-label="TaskControl — главная"
    >
      TASK<span>CONTROL</span>
    </Link>
  );
}
export function PageHeading({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  back?: string;
}) {
  useEffect(() => {
    document.title = `${title} — TaskControl`;
  }, [title]);
  return (
    <>
      <div className="page-heading">
        {back && (
          <Link to={back} className="back-link">
            <ArrowLeft size={16} />
            Назад
          </Link>
        )}
        <div className="page-heading-row">
          <div>
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </div>
          {action && <div className="heading-actions">{action}</div>}
        </div>
      </div>
    </>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge status-${status}`}>{statusLabels[status]}</span>;
}
export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`priority priority-${priority}`}>
      <span aria-hidden="true" />
      {priorityLabels[priority]}
    </span>
  );
}
export function Progress({ value, label }: { value: number; label?: string }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label ?? 'Выполнение проекта'}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div style={{ transform: `scaleX(${value / 100})` }} />
    </div>
  );
}
export function Avatar({ name, size = 'normal' }: { name: string; size?: 'normal' | 'small' }) {
  return (
    <span className={`avatar avatar-${size}`} role="img" aria-label={name}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
export function Empty({
  title = 'Пока ничего нет',
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={32} strokeWidth={1.3} />
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'warning' | 'success';
}) {
  return <div className={`notice notice-${tone}`}>{children}</div>;
}
export function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Panel({
  title,
  children,
  action,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Stat({
  value,
  label,
  accent = false,
  to,
}: {
  value: number | string;
  label: string;
  accent?: boolean;
  to?: string;
}) {
  const content = (
    <>
      <strong className={accent ? 'accent' : ''}>
        {typeof value === 'number' ? String(value).padStart(2, '0') : value}
      </strong>
      <span>{label}</span>
      {to && <ArrowUpRight size={18} />}
    </>
  );
  return to ? (
    <Link to={to} className="stat">
      {content}
    </Link>
  ) : (
    <div className="stat">{content}</div>
  );
}
export function Tabs({
  options,
  value,
  onChange,
  label = 'Представление',
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div className="tabs" role="group" aria-label={label}>
      {options.map((o) => (
        <Button
          key={o.value}
          variant="ghost"
          aria-pressed={value === o.value}
          className={value === o.value ? 'tab-active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    else if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className="modal" aria-labelledby={titleId} onCancel={onClose}>
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <Button variant="ghost" aria-label="Закрыть окно" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>
      {children}
    </dialog>
  );
}
export function Confirm({
  open,
  title,
  description,
  onClose,
  onConfirm,
  busy = false,
  actionLabel = 'Подтвердить',
  danger = false,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
  actionLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p>{description}</p>
      <div className="form-actions">
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} disabled={busy} onClick={onConfirm}>
          {actionLabel}
        </Button>
      </div>
    </Modal>
  );
}
export function Screen({ children }: { children: ReactNode }) {
  const reduced = useMotionPreference();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0.75 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
      className="screen"
    >
      {children}
    </motion.div>
  );
}
export function CheckLine({ children }: { children: ReactNode }) {
  return (
    <div className="check-line">
      <Check size={18} />
      {children}
    </div>
  );
}
export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-link">
      {children}
      <ChevronRight size={15} />
    </Link>
  );
}
export function NotFound({ forbidden = false }: { forbidden?: boolean }) {
  return (
    <Screen>
      <PageHeading
        title={forbidden ? 'Нет доступа' : 'Страница не найдена'}
        description={
          forbidden
            ? 'Этот раздел недоступен для выбранного профиля.'
            : 'Адрес изменился или запись больше не существует.'
        }
      />
      <Empty
        title={forbidden ? 'Выберите доступный раздел' : 'Вернёмся к рабочему пространству'}
        action={<ActionLink to="/app">Открыть обзор</ActionLink>}
      />
    </Screen>
  );
}
