import { useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Badge } from '@/shared/components/ui/Badge';
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { CanvasNodeData } from '@drama/types';

const statusMap: Record<string, { label: string; variant: 'default' | 'accent' | 'success' | 'warning' }> = {
  draft: { label: '草稿', variant: 'default' },
  in_progress: { label: '进行中', variant: 'accent' },
  review: { label: '审核中', variant: 'warning' },
  done: { label: '已完成', variant: 'success' },
};

export function ScriptCardNode({ data, id, selected }: NodeProps<Node<CanvasNodeData>>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.title);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const status = data.status ? statusMap[data.status as string] : null;
  const dialogue = data.dialogue as string | undefined;
  const location = data.location as string | undefined;
  const duration = data.duration as number | undefined;
  const timeOfDay = data.timeOfDay as string | undefined;

  const displayNumber = (data._displayNumber as string) ?? '';

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== data.title) {
      updateNodeData(id, { title: editValue.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`group w-[240px] rounded-[var(--radius-base)] border bg-[var(--color-bg-secondary)] shadow-sm transition-shadow ${
        selected ? 'border-[var(--color-accent-500)] shadow-md' : 'border-[var(--color-border-default)]'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />

      <div className="rounded-t-[var(--radius-base)] bg-[var(--color-bg-secondary)] px-3 py-1.5 border-b-2 border-[var(--color-accent-300)] flex items-center gap-1.5">
        {displayNumber && (
          <span className="text-[9px] font-mono text-[var(--color-text-tertiary)] tracking-[0.02em] shrink-0">{displayNumber}</span>
        )}
        <span className="text-[10px] font-semibold text-[var(--color-accent-600)] uppercase tracking-wider">📝 剧本</span>
      </div>

      <div className="p-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          {isEditing ? (
            <input autoFocus value={editValue}
              onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditValue(data.title); setIsEditing(false); } }}
              className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-sm font-medium outline-none"
            />
          ) : (
            <h4 className="text-[13px] font-medium text-[var(--color-text-primary)] cursor-text"
              onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }} title="双击编辑">
              {data.title}
            </h4>
          )}
          {status && <Badge variant={status.variant}>{status.label}</Badge>}
        </div>

        {data.description && (
          <p className="text-[11px] text-[var(--color-text-tertiary)] line-clamp-3 mb-2">{data.description}</p>
        )}

        {dialogue && (
          <div className="mb-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] px-2 py-1.5">
            <p className="text-[11px] text-[var(--color-text-secondary)] italic leading-relaxed line-clamp-2">💬 {dialogue}</p>
          </div>
        )}

        <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-tertiary)] border-t border-[var(--color-border-default)] pt-2">
          {duration != null && <span>⏱ {duration}s</span>}
          {location && <span>📍 {location}</span>}
          {timeOfDay && <span>🌅 {timeOfDay}</span>}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
    </div>
  );
}
