import { useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { File, Image, Music, Video, FileText, ImageOff } from 'lucide-react';
import { Lightbox } from '@/components/ui/Lightbox';
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const type = (data.description ?? 'other') as AssetType;
  const Icon = typeIcons[type] ?? File;
  const hasThumbnail = !!data.thumbnail && !imgError;
  const isImageType = type === 'image';

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
        className={`w-[200px] rounded-[var(--radius-base)] border bg-[var(--color-bg-secondary)] p-4 shadow-sm transition-shadow ${
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
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-secondary)] px-1 py-0.5 text-sm font-medium outline-none"
              />
            ) : (
              <p
                className="truncate text-sm font-medium text-[var(--color-text-primary)] cursor-text"
                onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }}
                title="双击编辑"
              >
                {data.title}
              </p>
            )}
            <p className="text-[11px] text-[var(--color-text-tertiary)] capitalize">{type}</p>
          </div>
        </div>

        {/* Thumbnail preview for image assets */}
        {hasThumbnail && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
            className="mt-2 w-full overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border-default)] hover:border-[var(--color-accent-500)] transition-colors"
            title="点击放大预览"
          >
            <img
              src={data.thumbnail}
              alt={data.title}
              className="h-[100px] w-full object-cover"
              onError={() => setImgError(true)}
              draggable={false}
            />
          </button>
        )}
        {isImageType && data.thumbnail && imgError && (
          <div className="mt-2 flex h-[100px] w-full items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-secondary)]">
            <ImageOff className="h-5 w-5 text-[var(--color-text-tertiary)]" />
          </div>
        )}

        <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-accent-500)]" />
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
