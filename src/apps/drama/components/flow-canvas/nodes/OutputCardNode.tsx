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
      style={{
        position: 'relative',
        width: 240,
        borderRadius: 'var(--radius-base)',
        border: selected ? '1.5px solid var(--color-accent-500)' : '1px solid var(--color-border-default)',
        background: 'var(--color-bg-secondary)',
        boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: 'var(--color-accent-500)' }} />

      <div
        style={{
          borderTopLeftRadius: 'var(--radius-base)',
          borderTopRightRadius: 'var(--radius-base)',
          background: 'var(--color-accent-100)',
          padding: '6px 12px',
          borderBottom: '1px solid var(--color-border-default)',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-accent-700)', textTransform: 'uppercase' }}>📦 产出 · {typeLabel}</span>
      </div>

      <div style={{ padding: 12 }}>
        {isEditing ? (
          <input autoFocus value={editValue}
            onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditValue(data.title); setIsEditing(false); } }}
            style={{
              width: '100%', border: '1px solid var(--color-accent-500)',
              background: 'var(--color-bg-secondary)', padding: '2px 6px',
              fontSize: 14, fontWeight: 500, outline: 'none', borderRadius: 'var(--radius-sm)',
            }}
          />
        ) : (
          <h4 style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0, cursor: 'text' }}
            onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }}>
            {data.title}
          </h4>
        )}

        {sourceTaskId && (
          <p style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginTop: 4 }}>来源: Agent 任务</p>
        )}

        {summary && (
          <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginTop: 8 }}>{summary}</p>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: 'var(--color-accent-500)' }} />
    </div>
  );
}
