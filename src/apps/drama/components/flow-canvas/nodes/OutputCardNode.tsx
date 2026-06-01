import { useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Badge } from '@/shared/components/ui/Badge';
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { CanvasNodeData } from '@drama/types';

const typeLabels: Record<string, { label: string; variant: 'default' | 'accent' | 'success' | 'warning' }> = {
  analysis: { label: '分析', variant: 'accent' },
  suggestion: { label: '建议', variant: 'warning' },
  generation: { label: '生成', variant: 'success' },
};

export function OutputCardNode({ data, id, selected }: NodeProps<Node<CanvasNodeData>>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.title);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const outputType = (data.outputType as string) || 'analysis';
  const summary = data.summary as string | undefined;
  const typeInfo = typeLabels[outputType] ?? { label: '产出', variant: 'default' as const };

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== data.title) {
      updateNodeData(id, { title: editValue.trim() });
    }
    setIsEditing(false);
  };

  return (
    <>
      <div
        className={`w-[240px] rounded-[var(--radius-base)] border bg-[var(--color-bg-secondary)] shadow-sm transition-shadow ${
          selected
            ? 'border-[var(--color-accent-500)] shadow-md'
            : 'border-[var(--color-border-default)]'
        }`}
      >
        <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />

        {/* Purple header */}
        <div className="rounded-t-[var(--radius-base)] bg-[var(--color-accent-100)] px-3 py-1.5 border-b border-[var(--color-border-default)]">
          <span className="text-[10px] font-semibold text-[var(--color-accent-700)] uppercase tracking-wider">
            📦 产出
          </span>
        </div>

        {/* Card body */}
        <div className="p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
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
                className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-sm font-medium outline-none"
              />
            ) : (
              <h4
                className="text-sm font-medium text-[var(--color-text-primary)] cursor-text"
                onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }}
                title="双击编辑"
              >
                {data.title}
              </h4>
            )}
            <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
          </div>

          {summary && (
            <p className="text-xs text-[var(--color-text-tertiary)] line-clamp-3 mb-2">{summary}</p>
          )}

          {/* Bottom bar — always visible for structural consistency */}
          <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-tertiary)] border-t border-[var(--color-border-default)] pt-2">
            <span>📦 Agent 产出</span>
          </div>
        </div>

        <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
      </div>
    </>
  );
}
