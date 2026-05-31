import type { InputHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-base-gray-400)] transition-colors focus:border-[var(--color-accent-500)] focus:outline-none focus:ring-[1.5px] focus:ring-[var(--color-accent-500)]',
        className
      )}
      {...props}
    />
  );
}
