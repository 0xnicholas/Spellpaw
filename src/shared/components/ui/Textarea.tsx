import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, rows = 3, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(
        'w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-base-gray-400)] transition-colors focus:border-[var(--color-accent-500)] focus:outline-none focus:ring-[1.5px] focus:ring-[var(--color-accent-500)]',
        className
      )}
      {...props}
    />
  );
}
