import { Handle, Position, type NodeProps } from '@xyflow/react';
import { File, Image, Music, Video, FileText } from 'lucide-react';
import type { AssetType } from '@/types';

const typeIcons: Record<string, typeof File> = {
  video: Video,
  image: Image,
  audio: Music,
  script: FileText,
  subtitle: FileText,
  other: File,
};

export function AssetCardNode({ data, selected }: NodeProps<any>) {
  const type = (data.description ?? 'other') as AssetType;
  const Icon = typeIcons[type] ?? File;

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
          <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
            {data.title}
          </p>
          <p className="text-[11px] text-[var(--color-text-tertiary)] capitalize">{type}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-accent-500)]" />
    </div>
  );
}
