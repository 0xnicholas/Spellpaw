import { useState } from 'react';
import { FolderOpen, FileText, Image, Music, Video, File, Search, List, Grip } from 'lucide-react';
import { PanelHeader } from '@/shared/components/ui/PanelHeader';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Divider } from '@/shared/components/ui/Divider';
import { formatBytes } from '@/shared/lib/utils';
import { mockAssets } from '@drama/data/mockAssets';
import type { AssetItem, AssetTab, AssetType } from '@drama/types';

const typeIcons: Record<AssetType, typeof FileText> = {
  video: Video,
  image: Image,
  audio: Music,
  script: FileText,
  subtitle: FileText,
  other: File,
};

const typeLabels: Record<AssetType, string> = {
  video: '视频',
  image: '图像',
  audio: '音频',
  script: '脚本',
  subtitle: '字幕',
  other: '其他',
};

export function AssetManagerPanel() {
  const [tab, setTab] = useState<AssetTab>('materials');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('list');

  const assets = tab === 'materials' ? mockAssets : []; // No outputs mock yet

  const filtered = assets.filter((a) =>
    a.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title="资产"
        icon={<FolderOpen className="h-4 w-4" />}
        actions={
          <div className="flex items-center gap-1">
            <IconButton
              icon={<List className="h-3.5 w-3.5" />}
              label="列表视图"
              size="sm"
              active={view === 'list'}
              onClick={() => setView('list')}
            />
            <IconButton
              icon={<Grip className="h-3.5 w-3.5" />}
              label="网格视图"
              size="sm"
              active={view === 'grid'}
              onClick={() => setView('grid')}
            />
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border-default)]">
        <button
          onClick={() => setTab('materials')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            tab === 'materials'
              ? 'text-[var(--color-accent-500)] border-b-2 border-[var(--color-accent-500)]'
              : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
          }`}
        >
          素材
        </button>
        <button
          onClick={() => setTab('outputs')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            tab === 'outputs'
              ? 'text-[var(--color-accent-500)] border-b-2 border-[var(--color-accent-500)]'
              : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
          }`}
        >
          输出
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <Input
          placeholder="搜索文件…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-7 text-xs"
        />
      </div>

      <Divider />

      {/* List */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title="暂无文件"
            description="资产将显示在这里"
          />
        ) : (
          <div className="py-1">
            {filtered.map((asset) => (
              <AssetListItem key={asset.id} asset={asset} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssetListItem({ asset }: { asset: AssetItem }) {
  const Icon = typeIcons[asset.type];
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('assetId', asset.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className="group flex cursor-grab items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--color-bg-tertiary)] active:cursor-grabbing"
    >
      <Icon className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-[var(--color-text-primary)]">{asset.name}</p>
        <p className="text-[10px] text-[var(--color-text-tertiary)]">{formatBytes(asset.size)}</p>
      </div>
      <Badge variant="default" className="shrink-0">
        {typeLabels[asset.type]}
      </Badge>
    </div>
  );
}
