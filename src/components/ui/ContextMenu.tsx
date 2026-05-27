import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

interface ContextMenuProps {
  items: MenuItem[];
  children: ReactNode;
}

export function ContextMenu({ items, children }: ContextMenuProps) {
  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>{children}</ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content
          className="z-50 min-w-[160px] overflow-hidden rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] py-1 shadow-sm"
          alignOffset={4}
        >
          {items.map((item) => (
            <ContextMenuPrimitive.Item
              key={item.id}
              disabled={item.disabled}
              onClick={item.onClick}
              className={cn(
                'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none transition-colors hover:bg-[var(--color-bg-tertiary)]',
                item.disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {item.icon && <span className="text-[var(--color-text-tertiary)]">{item.icon}</span>}
              <span>{item.label}</span>
            </ContextMenuPrimitive.Item>
          ))}
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}
