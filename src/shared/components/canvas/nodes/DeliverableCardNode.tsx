import { useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Image, Video, Music, Play, ImageOff, Clock, HardDrive, Maximize } from 'lucide-react';
import { Lightbox } from '@/shared/components/ui/Lightbox';
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { CanvasNodeData, DeliverableType } from '@drama/types';

const typeConfig: Record<DeliverableType, {
  icon: typeof Image;
  label: string;
  headerBg: string;
  headerText: string;
  accentColor: string;
}> = {
  image: {
    icon: Image,
    label: '图片',
    headerBg: 'var(--color-accent-50)',
    headerText: 'var(--color-accent-700)',
    accentColor: 'var(--color-accent-500)',
  },
  video: {
    icon: Video,
    label: '视频',
    headerBg: 'var(--color-status-warning-bg)',
    headerText: 'var(--color-status-warning-text)',
    accentColor: 'var(--color-accent-500)',
  },
  audio: {
    icon: Music,
    label: '音频',
    headerBg: 'var(--color-status-success-bg)',
    headerText: 'var(--color-status-success-text)',
    accentColor: 'var(--color-accent-500)',
  },
};

function formatDuration(seconds?: number): string {
  if (seconds == null) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes?: number): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function AudioWaveform() {
  return (
    <div className="flex items-end justify-center gap-[2px] h-10 w-full px-1">
      {[0.4, 0.7, 0.5, 0.9, 0.6, 1, 0.8, 0.5, 0.75, 0.6, 0.3, 0.7, 0.5, 0.85, 0.65, 0.45, 0.9, 0.55, 0.4, 0.7].map((h, i) => (
        <div
          key={i}
          className="w-[2px] rounded-full"
          style={{
            height: `${h * 100}%`,
            backgroundColor: `oklch(55% ${0.12 + h * 0.08} 275 / ${0.4 + h * 0.6})`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

export function DeliverableCardNode({ data, id, selected }: NodeProps<Node<CanvasNodeData>>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.title);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const displayNumber = (data._displayNumber as string) ?? '';
  const deliverableType: DeliverableType = data.deliverableType ?? 'image';
  const config = typeConfig[deliverableType];
  const Icon = config.icon;
  const hasThumbnail = !!data.thumbnail && !imgError;
  const duration = data.duration as number | undefined;
  const fileSize = data.fileSize as number | undefined;
  const resolution = data.resolution as string | undefined;

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

  return (
    <>
      <div
        className={`group w-[240px] rounded-[var(--radius-base)] border bg-[var(--color-bg-secondary)] shadow-sm transition-shadow ${
          selected
            ? 'border-[var(--color-accent-500)] shadow-md'
            : 'border-[var(--color-border-default)]'
        }`}
      >
        <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />

        {/* Header: 产出物 type badge */}
        <div
          className="rounded-t-[var(--radius-base)] px-3 py-1.5 border-b border-[var(--color-border-default)] flex items-center gap-1.5"
          style={{ backgroundColor: config.headerBg }}
        >
          {displayNumber && (
            <span className="text-[9px] font-mono text-[var(--color-text-tertiary)] tracking-[0.02em] shrink-0">{displayNumber}</span>
          )}
          <Icon className="h-3 w-3" style={{ color: config.headerText }} />
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: config.headerText }}
          >
            📦 产出物 · {config.label}
          </span>
        </div>

        {/* Type-specific content area */}
        {deliverableType === 'image' && (
          <ImageContent
            data={data}
            hasThumbnail={hasThumbnail}
            imgLoaded={imgLoaded}
            setImgLoaded={setImgLoaded}
            imgError={imgError}
            setImgError={setImgError}
            setLightboxOpen={setLightboxOpen}
            resolution={resolution}
            fileSize={fileSize}
          />
        )}

        {deliverableType === 'video' && (
          <VideoContent
            data={data}
            hasThumbnail={hasThumbnail}
            imgLoaded={imgLoaded}
            setImgLoaded={setImgLoaded}
            imgError={imgError}
            setImgError={setImgError}
            setLightboxOpen={setLightboxOpen}
            duration={duration}
            fileSize={fileSize}
            resolution={resolution}
          />
        )}

        {deliverableType === 'audio' && (
          <AudioContent
            duration={duration}
            fileSize={fileSize}
          />
        )}

        {/* Card body: title + description */}
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
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-sm font-medium outline-none"
            />
          ) : (
            <h4
              className="text-[13px] font-medium text-[var(--color-text-primary)] cursor-text truncate"
              onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }}
              title="双击编辑"
            >
              {data.title}
            </h4>
          )}
          {data.description && (
            <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)] line-clamp-2">
              {data.description}
            </p>
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

/* ── Image Content ── */

function ImageContent({ data, hasThumbnail, imgLoaded, setImgLoaded, imgError, setImgError, setLightboxOpen, resolution, fileSize }: {
  data: CanvasNodeData;
  hasThumbnail: boolean;
  imgLoaded: boolean;
  setImgLoaded: (v: boolean) => void;
  imgError: boolean;
  setImgError: (v: boolean) => void;
  setLightboxOpen: (v: boolean) => void;
  resolution?: string;
  fileSize?: number;
}) {
  return (
    <div className="relative">
      {hasThumbnail ? (
        <>
          {!imgLoaded && (
            <div className="aspect-[4/3] w-full animate-pulse bg-[var(--color-bg-tertiary)]" />
          )}
          {imgError ? (
            <div className="flex aspect-[4/3] w-full items-center justify-center bg-[var(--color-bg-tertiary)]">
              <div className="text-center">
                <ImageOff className="mx-auto h-5 w-5 text-[var(--color-text-tertiary)]" />
                <span className="mt-1 block text-[9px] text-[var(--color-text-tertiary)]">加载失败</span>
              </div>
            </div>
          ) : (
            <img
              src={data.thumbnail}
              alt={data.title}
              className={`aspect-[4/3] w-full object-cover transition-opacity ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => { setImgError(true); setImgLoaded(true); }}
              onClick={() => setLightboxOpen(true)}
              style={{ cursor: 'pointer' }}
              draggable={false}
            />
          )}
        </>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-[var(--color-bg-tertiary)]">
          <div className="text-center">
            <Image className="mx-auto h-6 w-6 text-[var(--color-text-tertiary)]" />
            <span className="mt-1 block text-[10px] text-[var(--color-text-tertiary)]">暂无预览</span>
          </div>
        </div>
      )}

      {/* Image metadata overlay */}
      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-2">
        {resolution && (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
            <Maximize className="h-2.5 w-2.5" />
            {resolution}
          </span>
        )}
        {fileSize != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
            <HardDrive className="h-2.5 w-2.5" />
            {formatFileSize(fileSize)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Video Content ── */

function VideoContent({ data, hasThumbnail, imgLoaded, setImgLoaded, imgError, setImgError, setLightboxOpen, duration, fileSize, resolution }: {
  data: CanvasNodeData;
  hasThumbnail: boolean;
  imgLoaded: boolean;
  setImgLoaded: (v: boolean) => void;
  imgError: boolean;
  setImgError: (v: boolean) => void;
  setLightboxOpen: (v: boolean) => void;
  duration?: number;
  fileSize?: number;
  resolution?: string;
}) {
  return (
    <div className="relative">
      {hasThumbnail ? (
        <>
          {!imgLoaded && (
            <div className="aspect-video w-full animate-pulse bg-[var(--color-bg-tertiary)]" />
          )}
          {imgError ? (
            <div className="flex aspect-video w-full items-center justify-center bg-[var(--color-bg-tertiary)]">
              <div className="text-center">
                <ImageOff className="mx-auto h-5 w-5 text-[var(--color-text-tertiary)]" />
                <span className="mt-1 block text-[9px] text-[var(--color-text-tertiary)]">加载失败</span>
              </div>
            </div>
          ) : (
            <div className="relative aspect-video w-full group">
              <img
                src={data.thumbnail}
                alt={data.title}
                className={`h-full w-full object-cover transition-opacity ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => { setImgError(true); setImgLoaded(true); }}
                onClick={() => setLightboxOpen(true)}
                style={{ cursor: 'pointer' }}
                draggable={false}
              />
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                <div className="rounded-full bg-white/90 p-2 shadow-md group-hover:scale-110 transition-transform">
                  <Play className="h-4 w-4 text-[var(--color-base-gray-900)] fill-[var(--color-base-gray-900)] ml-0.5" />
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-[var(--color-bg-tertiary)]">
          <div className="text-center flex flex-col items-center gap-1">
            <div className="rounded-full bg-[var(--color-bg-secondary)] p-2">
              <Video className="h-5 w-5 text-[var(--color-text-tertiary)]" />
            </div>
            <span className="text-[10px] text-[var(--color-text-tertiary)]">暂无预览</span>
          </div>
        </div>
      )}

      {/* Video metadata overlay */}
      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-2">
        {duration != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
            <Clock className="h-2.5 w-2.5" />
            {formatDuration(duration)}
          </span>
        )}
        {resolution && (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
            <Maximize className="h-2.5 w-2.5" />
            {resolution}
          </span>
        )}
        {fileSize != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
            <HardDrive className="h-2.5 w-2.5" />
            {formatFileSize(fileSize)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Audio Content ── */

function AudioContent({ duration, fileSize }: { duration?: number; fileSize?: number }) {
  return (
    <div className="px-3 py-3">
      {/* Audio waveform visualization */}
      <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] p-3">
        <AudioWaveform />

        {/* Audio metadata */}
        <div className="mt-2 flex items-center justify-between">
          {duration != null ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)]">
              <Clock className="h-3 w-3" />
              {formatDuration(duration)}
            </span>
          ) : (
            <span />
          )}
          {fileSize != null && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)]">
              <HardDrive className="h-3 w-3" />
              {formatFileSize(fileSize)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
