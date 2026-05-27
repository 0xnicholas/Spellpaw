import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-[11px] font-medium text-[var(--color-text-secondary)]">{label}</label>
      {children}
    </div>
  );
}
