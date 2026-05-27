import { Handle, Position, type NodeProps } from '@xyflow/react';

export function NoteCardNode({ data, selected }: NodeProps<any>) {
  return (
    <div
      className={`w-[200px] rounded-[var(--radius-base)] border p-4 shadow-sm transition-shadow ${
        selected
          ? 'border-[var(--color-accent-500)] shadow-md'
          : 'border-[var(--color-border-default)]'
      }`}
      style={{ backgroundColor: data.color ?? '#fef3c7' }}
    >
      <Handle type="target" position={Position.Top} className="!bg-[var(--color-accent-500)]" />
      <h4 className="mb-1.5 text-sm font-medium text-[var(--color-text-primary)]">{data.title}</h4>
      {data.description && (
        <p className="text-xs text-[var(--color-text-secondary)]">{data.description}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-accent-500)]" />
    </div>
  );
}
