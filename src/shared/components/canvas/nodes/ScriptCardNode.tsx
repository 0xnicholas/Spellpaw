import { useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { BuzzyCard } from '../BuzzyCard';
import type { CanvasNodeData } from '@drama/types';

export function ScriptCardNode({ data, id, selected }: NodeProps<Node<CanvasNodeData>>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.title);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const description = data.description;

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== data.title) {
      updateNodeData(id, { title: editValue.trim() });
    }
    setIsEditing(false);
  };

  return (
    <BuzzyCard type="script" data={data} selected={selected} ariaLabel={`剧本：${data.title}`}>
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />

      <div className="px-3 pb-3">
        {isEditing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') { setEditValue(data.title); setIsEditing(false); }
            }}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-primary)] px-1.5 py-0.5 text-sm font-medium text-[var(--color-text-primary)] outline-none"
          />
        ) : (
          <h4
            className="text-[13px] font-medium text-[var(--color-text-primary)] cursor-text"
            onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }}
            title="双击编辑"
          >
            {data.title}
          </h4>
        )}

        {description && (
          <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)] line-clamp-3">{description}</p>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
    </BuzzyCard>
  );
}
