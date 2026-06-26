import { useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { BuzzyCard } from '../BuzzyCard';
import { InlineEditableText } from '../InlineEditableText';
import type { CanvasNodeData } from '@drama/types';

export function ScriptCardNode({ data, id, selected }: NodeProps<Node<CanvasNodeData>>) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(data.title);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const description = data.description as string | undefined;

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle.trim() !== data.title) {
      updateNodeData(id, { title: editTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  return (
    <BuzzyCard type="script" data={data} selected={selected} ariaLabel={`剧本：${data.title}`}>
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />

      <div className="px-3 pb-3 space-y-1.5">
        {isEditingTitle ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') { setEditTitle(data.title); setIsEditingTitle(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-primary)] px-1.5 py-0.5 text-sm font-medium text-[var(--color-text-primary)] outline-none"
          />
        ) : (
          <h4
            className="text-[13px] font-medium text-[var(--color-text-primary)] cursor-text"
            onDoubleClick={(e) => { e.stopPropagation(); setEditTitle(data.title); setIsEditingTitle(true); }}
            title="双击编辑标题"
          >
            {data.title}
          </h4>
        )}

        <InlineEditableText
          value={description ?? ''}
          placeholder="点击编辑内容…"
          onSave={(next) => updateNodeData(id, { description: next || undefined })}
        />
      </div>

      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
    </BuzzyCard>
  );
}
