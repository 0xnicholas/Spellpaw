import { useState, useRef, useEffect } from 'react';
import type { AIAction } from './cardAIActions';

export type { AIAction };

interface NodeAIActionsProps {
  actions: AIAction[];
  onAction: (prompt: string) => void;
}

/** Hover-revealed AI button on canvas cards — click to show quick-action menu */
export function NodeAIActions({ actions, onAction }: NodeAIActionsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (actions.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent-50)] text-[10px] text-[var(--color-accent-500)] opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-[var(--color-accent-500)] hover:bg-[var(--color-accent-100)]"
        title="AI 操作"
        aria-label="AI 操作"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        ✨
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-50 min-w-[140px] rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] py-1 shadow-lg">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={(e) => { e.stopPropagation(); setOpen(false); onAction(a.prompt); }}
              className="block w-full px-3 py-1.5 text-left text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** AI actions per card type have been moved to ./cardAIActions.ts so this
 * file exports only components (required for Vite's fast-refresh). */
