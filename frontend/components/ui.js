'use client';

import clsx from 'clsx';

export function Button({ variant = 'primary', size = 'md', className, children, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-btn transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'text-xs px-3 py-1.5', md: 'text-sm px-4 py-2.5', lg: 'text-sm px-5 py-3' };
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-50',
    ghost: 'bg-transparent text-ink-soft hover:bg-surface-line/60 hover:text-ink',
    danger: 'bg-danger text-white hover:bg-danger/90',
    subtle: 'bg-surface-line/60 text-ink hover:bg-surface-line',
  };
  return (
    <button className={clsx(base, sizes[size], variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function Card({ className, children, ...props }) {
  return (
    <div className={clsx('bg-surface-card rounded-card shadow-card border border-surface-line/70', className)} {...props}>
      {children}
    </div>
  );
}

export function Badge({ tone = 'default', children }) {
  const tones = {
    default: 'bg-surface-line text-ink-soft',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-bg text-amber',
    danger: 'bg-danger-bg text-danger',
    info: 'bg-slate-bg text-slate',
  };
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide', tones[tone])}>
      {children}
    </span>
  );
}

export function statusTone(status) {
  const map = {
    sent: 'success', completed: 'success', active: 'success', connected: 'success',
    pending: 'warning', submitted: 'warning', awaiting_payment: 'warning', sending: 'warning', scheduled: 'warning', past_due: 'warning',
    paid: 'success', approved: 'success',
    failed: 'danger', rejected: 'danger', expired: 'danger', cancelled: 'danger', unsubscribed: 'danger', bounced: 'danger', complained: 'danger',
    draft: 'default', 'not connected': 'default',
  };
  return map[String(status).toLowerCase()] || 'default';
}

export function Input({ label, error, className, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-semibold text-ink-soft mb-1.5">{label}</span>}
      <input
        className={clsx(
          'w-full rounded-lg border border-surface-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint',
          'focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-colors',
          error && 'border-danger focus:border-danger focus:ring-danger',
          className
        )}
        {...props}
      />
      {error && <span className="block text-xs text-danger mt-1">{error}</span>}
    </label>
  );
}

export function Textarea({ label, className, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-semibold text-ink-soft mb-1.5">{label}</span>}
      <textarea
        className={clsx(
          'w-full rounded-lg border border-surface-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint',
          'focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-colors',
          className
        )}
        {...props}
      />
    </label>
  );
}

export function Select({ label, className, children, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-semibold text-ink-soft mb-1.5">{label}</span>}
      <select
        className={clsx(
          'w-full rounded-lg border border-surface-line bg-white px-3.5 py-2.5 text-sm text-ink',
          'focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-colors',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={clsx('relative w-full bg-white rounded-card shadow-pop max-h-[88vh] flex flex-col', sizes[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-line">
          <h3 className="text-sm font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="text-ink-faint hover:text-ink text-lg leading-none">×</button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-surface-line flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
          <Icon size={20} className="text-emerald-600" />
        </div>
      )}
      <h3 className="text-sm font-bold text-ink mb-1">{title}</h3>
      {description && <p className="text-xs text-ink-soft max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function Spinner({ size = 20, className }) {
  return (
    <div
      className={clsx('animate-spin-slow rounded-full border-2 border-emerald-100 border-t-emerald-600', className)}
      style={{ width: size, height: size }}
    />
  );
}
