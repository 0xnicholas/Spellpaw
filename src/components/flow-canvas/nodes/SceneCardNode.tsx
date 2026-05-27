import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/Badge';

const statusMap: Record<string, { label: string; variant: 'default' | 'accent' | 'success' | 'warning' }> = {
  draft: { label: 'Draft', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'accent' },
  review: { label: 'Review', variant: 'warning' },
  done: { label: 'Done', variant: 'success' },
};

export function SceneCardNode({ data, selected }: NodeProps<any>) {
  const status = data.status ? statusMap[data.status] : null;

  return (
    <div
      className={`w-[240px] rounded-[var(--radius-base)] border bg-[var(--color-bg-primary)] p-4 shadow-sm transition-shadow ${
        selected
          ? 'border-[var(--color-accent-500)] shadow-md'
          : 'border-[var(--color-border-default)]'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-[var(--color-text-primary)]">{data.title}</h4>
        {status && <Badge variant={status.variant}>{status.label}</Badge>}
      </div>
      {data.description && (
        <p className="text-xs text-[var(--color-text-tertiary)] line-clamp-2">
          {data.description}
        </p>
      )}
      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
    </div>
  );
}
