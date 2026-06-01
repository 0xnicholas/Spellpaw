import { useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { CanvasNodeData } from '@drama/types';

export function OutputCardNode({ data, id, selected }: NodeProps<Node<CanvasNodeData>>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.title);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const outputType = data.outputType as string | undefined;
  const summary = data.summary as string | undefined;
  const sourceTaskId = data.sourceTaskId as string | undefined;

  const typeLabel = outputType === 'analysis' ? '分析' : outputType === 'suggestion' ? '建议' : outputType === 'generation' ? '生成' : '产出';

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== data.title) {
      updateNodeData(id, { title: editValue.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`w-[240px] rounded-[var(--radius-base)] border bg-[var(--color-bg-secondary)] shadow-sm transition-shadow ${
        selected ? 'border-[var(--color-accent-500)] shadow-md' : 'border-[var(--color-border-default)]'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />

      <div className="rounded-t-[var(--radius-base)] bg-[var(--color-bg-accent-subtle)] px-3 py-1.5 border-b border-[var(--color-border-default)]">
        <span className="text-[10px] font-semibold text-[var(--color-accent-500)] uppercase tracking-wider">📦 产出 · {typeLabel}</span>
      </div>

      <div className="p-3">
        {isEditing ? (
          <input autoFocus value={editValue}
            onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditValue(data.title); setIsEditing(false); } }}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-sm font-medium outline-none"
          />
        ) : (
          <h4 className="text-sm font-medium text-[var(--color-text-primary)] cursor-text"
            onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }}>
            {data.title}
          </h4>
        )}

        {sourceTaskId && (
          <p className="text-[9px] text-[var(--color-text-tertiary)] mt-1">来源: Agent 任务</p>
        )}

        {summary && (
          <p className="mt-2 text-[11px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-4">{summary}</p>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
    </div>
  );
}
