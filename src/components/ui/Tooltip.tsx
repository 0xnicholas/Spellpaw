import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

export function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className={cn(
              'z-50 rounded-[var(--radius-sm)] bg-[var(--color-base-gray-900)] px-2 py-1 text-xs text-white shadow-sm dark:bg-[var(--color-bg-secondary)] dark:text-[var(--color-text-primary)] dark:border dark:border-[var(--color-border-default)]'
            )}
            sideOffset={4}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
