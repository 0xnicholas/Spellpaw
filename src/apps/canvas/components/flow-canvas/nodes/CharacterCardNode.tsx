import { useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { CanvasNodeData } from '@drama/types';

export function CharacterCardNode({ data, id, selected }: NodeProps<Node<CanvasNodeData>>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.title);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const name = (data.name as string) || data.title;
  const role = data.role as string | undefined;
  const age = data.age as number | undefined;
  const occupation = data.occupation as string | undefined;
  const personality = data.personality as string | undefined;
  const appearance = data.appearance as string | undefined;
  const avatar = data.avatar as string | undefined;

  const displayNumber = (data._displayNumber as string) ?? '';

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== data.title) {
      updateNodeData(id, { title: editValue.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`w-[220px] rounded-[var(--radius-base)] border bg-[var(--color-bg-secondary)] shadow-sm transition-shadow ${
        selected ? 'border-[var(--color-accent-500)] shadow-md' : 'border-[var(--color-border-default)]'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />

      <div className="rounded-t-[var(--radius-base)] bg-[var(--color-status-success-bg)] px-3 py-1.5 border-b border-[var(--color-border-default)] flex items-center gap-1.5">
        {displayNumber && (
          <span className="text-[9px] font-mono text-[var(--color-text-tertiary)] tracking-[0.02em] shrink-0">{displayNumber}</span>
        )}
        <span className="text-[10px] font-semibold text-[var(--color-status-success-text)] uppercase tracking-wider">👤 人物角色</span>
      </div>

      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-xl"
            style={{ background: avatar ? `url(${avatar}) center/cover` : 'var(--color-bg-tertiary)' }}>
            {!avatar && '👤'}
          </div>

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <input autoFocus value={editValue}
                onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditValue(data.title); setIsEditing(false); } }}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-sm font-medium outline-none"
              />
            ) : (
              <h4 className="text-[13px] font-semibold text-[var(--color-text-primary)] cursor-text"
                onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }}>
                {name}
              </h4>
            )}

            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-[10px] text-[var(--color-text-tertiary)]">
              {role && <span>{role}</span>}
              {age != null && <span>{age}岁</span>}
              {occupation && <span>· {occupation}</span>}
            </div>

            {personality && (
              <p className="mt-1.5 text-[10px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
                {personality}
              </p>
            )}

            {appearance && (
              <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)] leading-relaxed line-clamp-2">
                {appearance}
              </p>
            )}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
    </div>
  );
}
