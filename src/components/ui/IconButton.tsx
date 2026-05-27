import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  active?: boolean;
  size?: 'sm' | 'md';
}

export function IconButton({
  icon,
  label,
  active = false,
  size = 'md',
  className,
  ...props
}: IconButtonProps) {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
  };

  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]',
        active && 'bg-[var(--color-accent-50)] text-[var(--color-accent-500)]',
        sizes[size],
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
