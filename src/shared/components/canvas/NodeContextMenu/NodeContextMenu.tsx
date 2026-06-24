import { useEffect } from 'react';
import { Copy, Edit3, Trash2, CopyPlus } from 'lucide-react';
import type { CanvasNodeType } from '@drama/types';

export type NodeAction = 'rename' | 'copy-id' | 'duplicate' | 'delete';

export interface NodeContextMenuProps {
  x: number;          // Screen coordinates (clientX) — for position: fixed
  y: number;          // Screen coordinates (clientY)
  nodeId: string;
  onAction: (action: NodeAction) => void;
  onClose: () => void;
}

interface MenuItem {
  action: NodeAction;
  label: string;
  icon: typeof Copy;
  destructive?: boolean;
  separatorAfter?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { action: 'rename',    label: 'Rename',       icon: Edit3 },
  { action: 'copy-id',   label: 'Copy ID',      icon: Copy },
  { action: 'duplicate', label: 'Duplicate',    icon: CopyPlus, separatorAfter: true },
  { action: 'delete',    label: 'Delete',       icon: Trash2, destructive: true },
];

export function NodeContextMenu({ x, y, nodeId, onAction, onClose }: NodeContextMenuProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <>
      <div
        data-testid="node-context-overlay"
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        data-testid="node-context-menu"
        className="fixed z-50 min-w-[160px] rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] py-1 shadow-lg"
        style={{ left: x, top: y }}
        data-node-id={nodeId}
      >
        {MENU_ITEMS.map(({ action, label, icon: Icon, destructive, separatorAfter }) => (
          <div key={action}>
            <button
              onClick={() => onAction(action)}
              data-testid={`node-context-${action}`}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[var(--color-bg-secondary)] ${
                destructive
                  ? 'text-red-500'
                  : 'text-[var(--color-text-primary)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 opacity-70" />
              <span>{label}</span>
            </button>
            {separatorAfter && <div className="my-1 border-t border-[var(--color-border-subtle)]" />}
          </div>
        ))}
      </div>
    </>
  );
}

// Re-export CanvasNodeType for convenience
export type { CanvasNodeType };