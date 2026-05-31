import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

interface BadgeProps {
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]',
    accent: 'bg-[var(--color-bg-accent-subtle)] text-[var(--color-accent-700)]',
    success: 'bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)]',
    warning: 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)]',
    danger: 'bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger-text)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
