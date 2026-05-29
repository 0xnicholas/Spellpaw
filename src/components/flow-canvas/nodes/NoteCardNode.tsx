import { useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useCanvasStore } from '@/stores/canvasStore';
import { ColorPicker } from '@/components/ui/ColorPicker';
import type { CanvasNodeData } from '@/types';

export function NoteCardNode({ data, id, selected }: NodeProps<Node<CanvasNodeData>>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(data.title);
  const [editDesc, setEditDesc] = useState(data.description ?? '');
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const handleSave = () => {
    updateNodeData(id, {
      title: editTitle.trim() || data.title,
      description: editDesc.trim(),
    });
    setIsEditing(false);
  };

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
      {isEditing ? (
        <div className="space-y-2">
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-white/80 px-1.5 py-0.5 text-sm font-medium outline-none"
          />
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            rows={2}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-white/80 px-1.5 py-0.5 text-xs outline-none resize-none"
          />
          <ColorPicker
            value={data.color ?? '#fef3c7'}
            onChange={(color) => updateNodeData(id, { color })}
          />
          <div className="flex justify-end gap-1">
            <button
              onClick={() => { setEditTitle(data.title); setEditDesc(data.description ?? ''); setIsEditing(false); }}
              className="text-[10px] px-2 py-1 rounded"
            >
              Cancel
            </button>
            <button onClick={handleSave} className="text-[10px] px-2 py-1 rounded bg-[var(--color-accent-500)] text-white">
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <h4
            className="mb-1.5 text-sm font-medium text-[var(--color-text-primary)] cursor-text"
            onDoubleClick={() => { setEditTitle(data.title); setEditDesc(data.description ?? ''); setIsEditing(true); }}
          >
            {data.title}
          </h4>
          {data.description && (
            <p className="text-xs text-[var(--color-text-secondary)]">{data.description}</p>
          )}
        </>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-accent-500)]" />
    </div>
  );
}
