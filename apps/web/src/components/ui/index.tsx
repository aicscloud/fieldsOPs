'use client';

import {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  useEffect,
} from 'react';
import { Eye, EyeOff, Loader2, X } from 'lucide-react';
import { useState } from 'react';

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}) {
  const variantClass =
    variant === 'secondary'
      ? 'btn-secondary'
      : variant === 'ghost'
        ? 'btn-ghost'
        : variant === 'danger'
          ? 'btn-danger'
          : '';
  const sizeClass =
    size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : size === 'icon' ? 'btn-icon' : '';
  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={16} className="spin" /> : null}
      {children}
    </button>
  );
}

export function Input({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className="field">
      {label ? <span>{label}</span> : null}
      <input className="input" {...props} />
      {error ? <span className="error-box" style={{ padding: '6px 10px' }}>{error}</span> : null}
    </label>
  );
}

export function PasswordInput({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const [show, setShow] = useState(false);
  return (
    <label className="field">
      {label ? <span>{label}</span> : null}
      <div className="input-wrap">
        <input
          className="input"
          type={show ? 'text' : 'password'}
          {...props}
        />
        <button
          type="button"
          className="input-action"
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          onClick={() => setShow((v) => !v)}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

export function Select({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      {label ? <span>{label}</span> : null}
      <select className="select" {...props}>
        {children}
      </select>
    </label>
  );
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SCHEDULED: 'Planifiée',
  ASSIGNED: 'Affectée',
  EN_ROUTE: 'En route',
  IN_PROGRESS: 'En cours',
  PAUSED: 'En pause',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
  FAILED: 'Échouée',
  SENT: 'Envoyé',
  PAID: 'Payé',
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
};

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status.replaceAll('_', ' ');
  return <span className={`badge badge-${status}`}>{label}</span>;
}

export function Card({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card card-pad ${className}`}>
      {title ? <h2 className="card-title">{title}</h2> : null}
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div style={{ fontSize: '1.05rem', marginBottom: 6 }}>{title}</div>
      {description ? <p style={{ margin: '0 0 12px' }}>{description}</p> : null}
      {action}
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%' }: { height?: number; width?: string | number }) {
  return <div className="skeleton" style={{ height, width }} />;
}

export function PageLoading({
  height = 220,
  rows = 1,
}: {
  height?: number;
  rows?: number;
}) {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height={height} />
      ))}
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return <div className="avatar" aria-hidden>{initials || 'U'}</div>;
}

export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-header">
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </Button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer ? <div className="drawer-footer">{footer}</div> : null}
      </aside>
    </>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`modal ${size === 'lg' ? 'modal-lg' : size === 'xl' ? 'modal-xl' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </Button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}
