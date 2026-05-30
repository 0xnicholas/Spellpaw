import { useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { ImageOff } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Lightbox } from '@/components/ui/Lightbox';
import { useCanvasStore } from '@/stores/canvasStore';
import type { CanvasNodeData } from '@/types';

const statusMap: Record<string, { label: string; variant: 'default' | 'accent' | 'success' | 'warning' }> = {
  draft: { label: 'Draft', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'accent' },
  review: { label: 'Review', variant: 'warning' },
  done: { label: 'Done', variant: 'success' },
};

export function SceneCardNode({ data, id, selected }: NodeProps<Node<CanvasNodeData>>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.title);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const status = data.status ? statusMap[data.status] : null;
  const hasThumbnail = !!data.thumbnail && !imgError;

  useEffect(() => {
    setImgError(false);
  }, [data.thumbnail]);

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== data.title) {
      updateNodeData(id, { title: editValue.trim() });
    }
    setIsEditing(false);
  };

  return (
    <>
      <div
        className={`w-[240px] rounded-[var(--radius-base)] border bg-[var(--color-bg-primary)] p-4 shadow-sm transition-shadow ${
          selected
            ? 'border-[var(--color-accent-500)] shadow-md'
            : 'border-[var(--color-border-default)]'
        }`}
      >
        <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />
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
              className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-primary)] px-1.5 py-0.5 text-sm font-medium outline-none"
            />
          ) : (
            <h4
              className="text-sm font-medium text-[var(--color-text-primary)] cursor-text"
              onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }}
              title="Double-click to edit"
            >
              {data.title}
            </h4>
          )}
          {status && <Badge variant={status.variant}>{status.label}</Badge>}
        </div>

        {/* Thumbnail */}
        {hasThumbnail && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
            className="mb-2 w-full overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border-default)] hover:border-[var(--color-accent-500)] transition-colors"
            title="点击放大预览"
          >
            <img
              src={data.thumbnail}
              alt={data.title}
              className="h-[120px] w-full object-cover"
              onError={() => setImgError(true)}
              draggable={false}
            />
          </button>
        )}
        {data.thumbnail && imgError && (
          <div className="mb-2 flex h-[120px] w-full items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-secondary)]">
            <ImageOff className="h-5 w-5 text-[var(--color-text-tertiary)]" />
          </div>
        )}

        {data.description && (
          <p className="text-xs text-[var(--color-text-tertiary)] line-clamp-2">{data.description}</p>
        )}
        <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
      </div>

      <Lightbox
        src={data.thumbnail ?? ''}
        alt={data.title}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
