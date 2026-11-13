import { useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Inbox,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

function cx(...values) {
  return values.filter(Boolean).join(' ');
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  to,
  href,
  loading = false,
  icon: Icon,
  className,
  disabled,
  type = 'button',
  ...props
}) {
  const classes = cx('btn', `btn-${variant}`, `btn-${size}`, className);
  const content = (
    <>
      {loading ? <Loader2 size={16} className="spin" /> : Icon ? <Icon size={16} /> : null}
      <span>{children}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes} {...props}>
        {content}
      </a>
    );
  }
  return (
    <button type={type} className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className, ...props }) {
  return (
    <button type="button" className={cx('icon-btn', className)} aria-label={label} title={label} {...props}>
      <Icon size={18} />
    </button>
  );
}

export function Card({ children, className, as: Tag = 'div', ...props }) {
  return (
    <Tag className={cx('card', className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cx('card-head', className)}>
      <div>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, tone = 'slate', dot = false, className, title }) {
  return (
    <span className={cx('badge', `badge-${tone}`, className)} title={title}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}

export function ProgressBar({ value, tone = 'primary', size = 'md', label, className }) {
  const raw = Number(value);
  const percent = Math.max(0, Math.min(100, Number.isFinite(raw) ? raw : 0));
  return (
    <div className={cx('progress-wrap', className)}>
      {(label || percent !== undefined) && label ? (
        <div className="progress-label">
          <span>{label}</span>
          <strong>{Math.round(percent)}%</strong>
        </div>
      ) : null}
      <div
        className={cx('progress', `progress-${size}`)}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label={label || 'Progress'}
      >
        <span className={cx('progress-fill', `tone-${tone}`)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function FormField({ label, htmlFor, error, hint, required, children, className }) {
  return (
    <div className={cx('field', className)}>
      {label && (
        <label htmlFor={htmlFor}>
          {label}
          {required && <span className="required"> *</span>}
        </label>
      )}
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, ...props }) {
  return <input className={cx('input', className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cx('input select', className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }) {
  return <textarea className={cx('input textarea', className)} {...props} />;
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className={cx('modal', `modal-${size}`)} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <IconButton icon={X} label="Close dialog" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  tone = 'danger',
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

export function Spinner({ label, size = 20 }) {
  return (
    <span className="spinner-inline" role="status">
      <Loader2 size={size} className="spin" />
      {label && <span>{label}</span>}
    </span>
  );
}

export function Loader({ label = 'Loading…' }) {
  return (
    <div className="loader-block">
      <Loader2 size={26} className="spin" />
      <p>{label}</p>
    </div>
  );
}

export function PageLoader({ label = 'Loading your dashboard…' }) {
  return (
    <div className="page-loader">
      <div className="page-loader-mark">
        <Loader2 size={30} className="spin" />
      </div>
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={cx('empty-state', className)}>
      <span className="empty-icon">
        <Icon size={24} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'We could not load this page.', onRetry, children }) {
  return (
    <div className="error-state" role="alert">
      <span className="error-icon">
        <AlertCircle size={24} />
      </span>
      <div>
        <h3>Something went wrong</h3>
        <p>{message}</p>
        {children}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {children}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}

export function StatCard({ icon: Icon, label, value, meta, tone = 'indigo', to, footer }) {
  const content = (
    <>
      <div className="stat-top">
        <span className={cx('stat-icon', `stat-${tone}`)}>{Icon && <Icon size={20} />}</span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {meta && <div className="stat-meta">{meta}</div>}
      {footer}
    </>
  );
  if (to) {
    return (
      <Link to={to} className="stat-card stat-card-link">
        {content}
      </Link>
    );
  }
  return <div className="stat-card">{content}</div>;
}

export function Pagination({ pagination, onPageChange, className }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, total, limit } = pagination;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className={cx('pagination', className)}>
      <span className="pagination-info">
        {from}–{to} of {total}
      </span>
      <div className="pagination-controls">
        <IconButton icon={ChevronLeft} label="Previous page" onClick={() => onPageChange(page - 1)} disabled={page <= 1} />
        <span className="pagination-page">
          Page {page} of {pages}
        </span>
        <IconButton icon={ChevronRight} label="Next page" onClick={() => onPageChange(page + 1)} disabled={page >= pages} />
      </div>
    </div>
  );
}

export function Avatar({ name, size = 'md', tone = 'indigo', className }) {
  const text = String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <span className={cx('avatar', `avatar-${size}`, `avatar-${tone}`, className)} aria-hidden="true">
      {text || '?'}
    </span>
  );
}

export function Notice({ tone = 'info', icon: Icon = AlertCircle, children, className }) {
  return (
    <div className={cx('notice', `notice-${tone}`, className)}>
      <Icon size={18} />
      <div>{children}</div>
    </div>
  );
}

export function Divider({ label }) {
  return <div className="divider">{label && <span>{label}</span>}</div>;
}
