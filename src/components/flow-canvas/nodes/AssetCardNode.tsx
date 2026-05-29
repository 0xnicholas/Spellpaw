import { useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { File, Image, Music, Video, FileText } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import type { AssetType, CanvasNodeData } from '@/types';

const typeIcons: Record<string, typeof File> = {
  video: Video,
  image: Image,
  audio: Music,
  script: FileText,
  subtitle: FileText,
  other: File,
};

export function AssetCardNode({ data, id, selected }: NodeProps<Node<CanvasNodeData>>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.title);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const type = (data.description ?? 'other') as AssetType;
  const Icon = typeIcons[type] ?? File;

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== data.title) {
      updateNodeData(id, { title: editValue.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`w-[200px] rounded-[var(--radius-base)] border bg-[var(--color-bg-primary)] p-4 shadow-sm transition-shadow ${
        selected
          ? 'border-[var(--color-accent-500)] shadow-md'
          : 'border-[var(--color-border-default)]'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-[var(--color-accent-500)]" />
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)]">
          <Icon className="h-5 w-5 text-[var(--color-text-tertiary)]" />
        </div>
        <div className="min-w-0">
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
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-primary)] px-1 py-0.5 text-sm font-medium outline-none"
            />
          ) : (
            <p
              className="truncate text-sm font-medium text-[var(--color-text-primary)] cursor-text"
              onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }}
              title="Double-click to edit"
            >
              {data.title}
            </p>
          )}
          <p className="text-[11px] text-[var(--color-text-tertiary)] capitalize">{type}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-accent-500)]" />
    </div>
  );
}
