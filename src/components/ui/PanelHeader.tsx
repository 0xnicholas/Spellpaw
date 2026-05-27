import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PanelHeaderProps {
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PanelHeader({ title, icon, actions, className }: PanelHeaderProps) {
  return (
    <div
      className={cn(
        'flex h-10 items-center justify-between border-b border-[var(--color-border-default)] px-3',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="text-[var(--color-text-tertiary)]">{icon}</span>}
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{title}</span>
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}
