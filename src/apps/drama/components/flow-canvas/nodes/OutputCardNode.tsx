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
    <div className={`w-[240px] rounded-lg border border-gray-200 bg-white shadow-sm ${selected ? 'ring-2 ring-[var(--color-accent-500)]' : ''}`}>
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />

      <div className="rounded-t-lg bg-[var(--color-accent-100)] px-3 py-1.5 border-b border-gray-200">
        <span className="text-[10px] font-semibold text-[var(--color-accent-700)] uppercase tracking-wider">📦 产出 · {typeLabel}</span>
      </div>

      <div className="p-3">
        {isEditing ? (
          <input autoFocus value={editValue}
            onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditValue(data.title); setIsEditing(false); } }}
            className="w-full rounded border border-[var(--color-accent-500)] bg-gray-50 px-1.5 py-0.5 text-sm font-medium outline-none"
          />
        ) : (
          <h4 className="text-sm font-medium text-gray-900 cursor-text"
            onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }}>
            {data.title}
          </h4>
        )}

        {sourceTaskId && (
          <p className="text-[9px] text-gray-400 mt-1">来源: Agent 任务</p>
        )}

        {summary && (
          <p className="mt-2 text-[11px] text-gray-600 leading-relaxed line-clamp-4">{summary}</p>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
    </div>
  );
}
