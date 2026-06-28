import { useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { ImageOff, Lock } from 'lucide-react';
import { Lightbox } from '@/shared/components/ui/Lightbox';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useStyleLockStore } from '@shared/stores/styleLockStore';
import { CanvasCard } from '../CanvasCard';
import type { CanvasNodeData } from '@drama/types';

export function ArtCardNode({ data, id, selected }: NodeProps<Node<CanvasNodeData>>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.title);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [hoverThumb, setHoverThumb] = useState(false);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const { lockedCardId, lockedStylePrompt: _lockedStylePrompt, lockStyle, clearLock: _clearLock } = useStyleLockStore();

  const thumbnail = data.thumbnail as string | undefined;
  const prompt = data.prompt as string | undefined;
  const tags = data.tags as string[] | undefined;
  const hasThumbnail = !!thumbnail && !imgError;
  const isLocked = lockedCardId === id;

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
    if (!prompt) return;
    lockStyle(id, prompt);
  };

  return (
    <CanvasCard type="art" data={data} selected={selected} ariaLabel={`美术：${data.title}`}>
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />

      {hasThumbnail ? (
        <div
          className="relative w-full flex-1 min-h-0 overflow-hidden"
          onMouseEnter={() => setHoverThumb(true)}
          onMouseLeave={() => setHoverThumb(false)}
        >
          {!imgLoaded && !imgError && (
            <div className="absolute inset-0 animate-pulse bg-[var(--color-bg-tertiary)]" />
          )}
          {imgError ? (
            <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-tertiary)]">
              <div className="text-center">
                <ImageOff className="mx-auto h-5 w-5 text-[var(--color-text-tertiary)]" />
                <span className="mt-1 block text-[9px] text-[var(--color-text-tertiary)]">加载失败</span>
              </div>
            </div>
          ) : (
            <img
              src={thumbnail}
              alt={data.title}
              className={`h-full w-full object-cover ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => { setImgError(true); setImgLoaded(true); }}
              onClick={() => setLightboxOpen(true)}
              style={{ cursor: 'pointer' }}
              draggable={false}
            />
          )}

          {hoverThumb && prompt && !imgError && (
            <button
              onClick={(e) => { e.stopPropagation(); handleLockStyle(); }}
              className="absolute inset-0 flex items-center justify-center bg-black/40"
            >
              <span className="rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)]/90 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-primary)]">
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
      ) : (
        <div className="flex flex-1 w-full items-center justify-center min-h-0">
          <ImageOff className="h-6 w-6 text-[var(--color-text-tertiary)]" />
        </div>
      )}

      <div className="p-3">
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
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-primary)] px-1.5 py-0.5 text-sm font-medium text-[var(--color-text-primary)] outline-none"
          />
        ) : (
          <h4
            className="text-sm font-medium text-[var(--color-text-primary)] cursor-text truncate"
            onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }}
          >
            {data.title}
          </h4>
        )}

        {prompt && (
          <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)] line-clamp-2">{prompt}</p>
        )}

        {tags && tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[8px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] px-1.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />

      <Lightbox
        src={thumbnail ?? ''}
        alt={data.title}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </CanvasCard>
  );
}
