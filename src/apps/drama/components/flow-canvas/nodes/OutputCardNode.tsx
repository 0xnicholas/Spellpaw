import { useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { CanvasNodeData } from '@drama/types';

// Exact same structure as ScriptCardNode - only content differs

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

      {/* Purple header - unique to output */}
      <div className="rounded-t-[var(--radius-base)] bg-[var(--color-accent-100)] px-3 py-1.5 border-b border-[var(--color-border-default)]">
        <span className="text-[10px] font-semibold text-[var(--color-accent-700)] uppercase tracking-wider">📦 产出 · {typeLabel}</span>
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
            <h4 className="text-sm font-medium text-[var(--color-text-primary)] cursor-text"
              onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }}>
              {data.title}
            </h4>
          )}
        </div>

        {sourceTaskId && (
          <p className="text-[9px] text-[var(--color-text-tertiary)] mb-2">来源: Agent 任务</p>
        )}

        {summary && (
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-2">{summary}</p>
        )}

        <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-tertiary)] border-t border-[var(--color-border-default)] pt-2">
          <span>📦 产出</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
    </div>
  );
}
