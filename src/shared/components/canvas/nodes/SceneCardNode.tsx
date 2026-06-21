import { useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { ImageOff, Lock } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { Lightbox } from '@/shared/components/ui/Lightbox';
import { NodeAIActions, getCardAIActions } from '../NodeAIActions';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useProjectStore } from '@drama/stores/projectStore';
import type { CanvasNodeData } from '@drama/types';

const statusMap: Record<string, { label: string; variant: 'default' | 'accent' | 'success' | 'warning' }> = {
  draft: { label: '草稿', variant: 'default' },
  in_progress: { label: '进行中', variant: 'accent' },
  review: { label: '审核中', variant: 'warning' },
  done: { label: '已完成', variant: 'success' },
};

export function SceneCardNode({ data, id, selected }: NodeProps<Node<CanvasNodeData>>) {
  const highlighted = (data as Record<string, unknown>)._highlighted as boolean | undefined;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.title);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [hoverThumb, setHoverThumb] = useState(false);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const setLockedStyle = useProjectStore((s) => s.setLockedStyle);
  const getLockedStyle = useProjectStore((s) => s.getLockedStyle);
  const status = data.status ? statusMap[data.status] : null;
  const hasThumbnail = !!data.thumbnail && !imgError;
  const isLocked = getLockedStyle().nodeId === data.linkedTreeNodeId;

  useEffect(() => {
    setImgError(false);
    setImgLoaded(false);
  }, [data.thumbnail]);

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== data.title) {
      updateNodeData(id, { title: editValue.trim() });
    }
    setIsEditing(false);
  };

  const handleLockStyle = () => {
    if (!data.generatedPrompt) return;
    if (data.linkedTreeNodeId) {
      setLockedStyle(data.generatedPrompt, data.linkedTreeNodeId);
    }
  };

  return (
    <>
      <div
        className={`group w-[240px] rounded-[var(--radius-base)] border bg-[var(--color-bg-secondary)] shadow-sm transition-shadow ${
          selected
            ? 'border-[var(--color-accent-500)] shadow-md'
            : 'border-[var(--color-border-default)]'
        } ${highlighted ? 'animate-card-pulse' : ''}`}
        style={highlighted ? {
          animation: 'cardPulse 0.6s ease-in-out 3',
          borderColor: 'var(--color-accent-500)',
        } : undefined}
      >
        <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />

        {/* Thumbnail area */}
        {hasThumbnail && (
          <div
            className="relative aspect-[9/16] w-full overflow-hidden rounded-t-[var(--radius-base)]"
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
                src={data.thumbnail}
                alt={data.title}
                className={`h-full w-full object-cover transition-opacity ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => { setImgError(true); setImgLoaded(true); }}
                onClick={() => data.thumbnail && setLightboxOpen(true)}
                style={{ cursor: 'pointer' }}
                draggable={false}
              />
            )}

            {/* Lock style overlay */}
            {hoverThumb && data.generatedPrompt && !imgError && (
              <button
                onClick={(e) => { e.stopPropagation(); handleLockStyle(); }}
                className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity"
              >
                <span className="rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)]/90 px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-primary)]">
                  {isLocked ? '🔒 已锁定' : '🔒 锁定风格'}
                </span>
              </button>
            )}

            {/* Locked indicator */}
            {isLocked && (
              <div className="absolute bottom-1.5 right-1.5 rounded-full bg-[var(--color-accent-500)] p-1">
                <Lock className="h-2.5 w-2.5 text-white" />
              </div>
            )}
          </div>
        )}

        {/* Card body */}
        <div className="p-4">
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
            {status && <Badge variant={status.variant}>{status.label}</Badge>}
            <NodeAIActions
              actions={getCardAIActions('sceneCard', data.title)}
              onAction={(prompt) => { const fn = (data as Record<string, unknown>)._onAIAction as ((p: string) => void) | undefined; fn?.(prompt); }}
            />
          </div>
          {data.description && (
            <p className="text-xs text-[var(--color-text-tertiary)] line-clamp-2">{data.description}</p>
          )}
        </div>

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
