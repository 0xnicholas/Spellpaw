import { Target } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';

export function ContextBar() {
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const getPath = useProjectStore((s) => s.getSelectedNodePath);
  const path = selectedNodeId ? getPath() : [];

  if (path.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 border-b border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-3 py-1.5">
      <Target className="h-3 w-3 text-[var(--color-accent-500)]" />
      <span className="text-[11px] text-[var(--color-text-tertiary)]">Discussing: </span>
      <span className="text-[11px] font-medium text-[var(--color-accent-500)]">
        {path[path.length - 1]}
      </span>
    </div>
  );
}
