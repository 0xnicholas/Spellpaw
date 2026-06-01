import { useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { ImageOff, Lock } from 'lucide-react';
import { Lightbox } from '@/shared/components/ui/Lightbox';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useProjectStore } from '@drama/stores/projectStore';
import type { CanvasNodeData } from '@drama/types';

export function ArtCardNode({ data, id, selected }: NodeProps<Node<CanvasNodeData>>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.title);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [hoverThumb, setHoverThumb] = useState(false);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const setLockedStyle = useProjectStore((s) => s.setLockedStyle);
  const getLockedStyle = useProjectStore((s) => s.getLockedStyle);

  const thumbnail = data.thumbnail as string | undefined;
  const prompt = data.prompt as string | undefined;
  const tags = data.tags as string[] | undefined;
  const linkedTreeNodeId = data.linkedTreeNodeId as string | undefined;
  const hasThumbnail = !!thumbnail && !imgError;
  const isLocked = getLockedStyle().nodeId === linkedTreeNodeId;

  useEffect(() => {
    setImgError(false);
    setImgLoaded(false);
  }, [thumbnail]);

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== data.title) {
      updateNodeData(id, { title: editValue.trim() });
    }
    setIsEditing(false);
  };

  const handleLockStyle = () => {
    if (!prompt || !linkedTreeNodeId) return;
    setLockedStyle(prompt, linkedTreeNodeId);
  };

  return (
    <>
      <div
        className={`w-[240px] rounded-[var(--radius-base)] border bg-[var(--color-bg-secondary)] shadow-sm transition-shadow ${
          selected ? 'border-[var(--color-accent-500)] shadow-md' : 'border-[var(--color-border-default)]'
        }`}
      >
        <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />

        <div className="rounded-t-[var(--radius-base)] bg-[var(--color-status-warning-bg)] px-3 py-1.5 border-b border-[var(--color-border-default)]">
          <span className="text-[10px] font-semibold text-[var(--color-status-warning-text)] uppercase tracking-wider">🎨 美术</span>
        </div>

        {hasThumbnail && (
          <div className="relative aspect-[9/16] w-full overflow-hidden"
            onMouseEnter={() => setHoverThumb(true)} onMouseLeave={() => setHoverThumb(false)}>
            {!imgLoaded && !imgError && (
              <div className="absolute inset-0 animate-pulse bg-[var(--color-bg-tertiary)]" />
            )}
            {imgError ? (
              <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-tertiary)]">
                <div className="text-center">
                  <ImageOff className="mx-auto h-5 w-5 text-[var(--color-text-tertiary)]" />
                  <span className="mt-1 block text-[10px] text-[var(--color-text-tertiary)]">加载失败</span>
                </div>
              </div>
            ) : (
              <img src={thumbnail} alt={data.title}
                className={`h-full w-full object-cover ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => { setImgError(true); setImgLoaded(true); }}
                onClick={() => setLightboxOpen(true)}
                style={{ cursor: 'pointer' }} draggable={false} />
            )}

            {hoverThumb && prompt && !imgError && (
              <button onClick={(e) => { e.stopPropagation(); handleLockStyle(); }}
                className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)]/90 px-2.5 py-1 text-[11px] font-medium">
                  {isLocked ? '🔒 已锁定' : '🔒 锁定风格'}
                </span>
              </button>
            )}
            {isLocked && (
              <div className="absolute bottom-1.5 right-1.5 rounded-full bg-[var(--color-accent-500)] p-1">
                <Lock className="h-2.5 w-2.5 text-white" />
              </div>
            )}
          </div>
        )}

        <div className="p-3">
          {isEditing ? (
            <input autoFocus value={editValue}
              onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditValue(data.title); setIsEditing(false); } }}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-sm font-medium outline-none"
            />
          ) : (
            <h4 className="text-sm font-medium text-[var(--color-text-primary)] cursor-text truncate"
              onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }}>
              {data.title}
            </h4>
          )}

          {prompt && (
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)] line-clamp-2">{prompt}</p>
          )}

          {tags && tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span key={tag} className="text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] px-1.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
      </div>

      <Lightbox src={thumbnail ?? ''} alt={data.title} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} />
    </>
  );
}
