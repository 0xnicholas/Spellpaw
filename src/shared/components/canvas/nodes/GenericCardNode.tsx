import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { CanvasNodeData } from '@drama/types';

type CardVisual = {
  icon: string;
  label: string;
  headerBg: string;
  headerBorder: string;
  accentBar: string;
};

const visual: Record<string, CardVisual> = {
  storyline:  { icon: '📖', label: '故事线',  headerBg: 'bg-violet-50',   headerBorder: 'border-violet-200', accentBar: 'bg-violet-400' },
  moodboard:  { icon: '🎨', label: '情绪板',  headerBg: 'bg-rose-50',     headerBorder: 'border-rose-200',   accentBar: 'bg-rose-400' },
  videoClip:  { icon: '🎬', label: '视频',    headerBg: 'bg-sky-50',      headerBorder: 'border-sky-200',    accentBar: 'bg-sky-400' },
  asset:      { icon: '📦', label: '素材',    headerBg: 'bg-amber-50',    headerBorder: 'border-amber-200',  accentBar: 'bg-amber-400' },
  task:       { icon: '📋', label: '任务',    headerBg: 'bg-emerald-50',  headerBorder: 'border-emerald-200', accentBar: 'bg-emerald-400' },
};

const statusBadge: Record<string, string> = {
  draft: '草稿', in_progress: '进行中', review: '审核', done: '完成',
};

export const GenericCardNode = memo(({ data, selected }: NodeProps<Node<CanvasNodeData>>) => {
  const v = visual[data.type as string] ?? { icon: '📄', label: '卡片', headerBg: 'bg-gray-50', headerBorder: 'border-gray-200', accentBar: 'bg-gray-400' };
  const highlighted = (data as Record<string, unknown>)._highlighted as boolean | undefined;
  const cardType = data.type as string;
  const status = data.status as string | undefined;

  return (
    <>
      <Handle type="target" position={Position.Left} />
      <div
        className={`w-[240px] rounded-[var(--radius-base)] border bg-[var(--color-bg-secondary)] shadow-sm transition-shadow overflow-hidden ${selected ? 'border-[var(--color-accent-500)] shadow-md' : 'border-[var(--color-border-default)]'} ${highlighted ? 'animate-card-pulse' : ''}`}
        style={highlighted ? { borderColor: 'var(--color-accent-500)' } : undefined}
      >
        {/* Type badge header */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 border-b ${v.headerBorder} ${v.headerBg}`}>
          <span className="text-[12px]">{v.icon}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">{v.label}</span>
          {status && (
            <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
              status === 'done' ? 'bg-emerald-100 text-emerald-700' :
              status === 'in_progress' ? 'bg-sky-100 text-sky-700' :
              status === 'review' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {statusBadge[status] ?? status}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-3">
          <h4 className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{data.title}</h4>
          {data.description && (
            <p className="text-[10px] text-[var(--color-text-tertiary)] line-clamp-2 mt-1">{data.description}</p>
          )}

          {/* Type-specific meta row */}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--color-text-tertiary)]">
            {cardType === 'storyline' && (
              <>
                {data.location && <span>📍 {data.location}</span>}
                {data.timeOfDay && <span>🌅 {data.timeOfDay}</span>}
                {data.duration != null && <span>⏱ {data.duration}s</span>}
                {data.sceneCount != null && <span>🎬 {data.sceneCount}场</span>}
                {data.shotCount != null && <span>📷 {data.shotCount}镜</span>}
              </>
            )}
            {cardType === 'moodboard' && (
              <>
                {data.colors && data.colors.length > 0 && (
                  <span className="flex items-center gap-1">
                    {data.colors.slice(0, 5).map((c, i) => (
                      <span key={i} className="inline-block w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                )}
                {data.styleRef && <span>🎯 {data.styleRef}</span>}
                {data.images?.length != null && <span>🖼️ {data.images.length}图</span>}
              </>
            )}
            {cardType === 'videoClip' && (
              <>
                {data.source && <span className={`rounded-full px-1.5 text-[9px] font-medium ${data.source === 'ai' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{data.source === 'ai' ? 'AI' : '上传'}</span>}
                {data.duration != null && <span>⏱ {data.duration}s</span>}
                {data.variants?.length != null && <span>🔄 {data.variants.length}变体</span>}
              </>
            )}
            {cardType === 'asset' && (
              <>
                {data.assetType && <span>📎 {data.assetType}</span>}
                {data.fileSize != null && <span>💾 {data.fileSize}</span>}
                {data.resolution && <span>📐 {data.resolution}</span>}
              </>
            )}
            {cardType === 'task' && (
              <>
                {data.taskType && (
                  <span className={`rounded-full px-1.5 text-[9px] font-medium ${
                    data.taskType === 'instruction' ? 'bg-sky-100 text-sky-700' :
                    data.taskType === 'feedback' ? 'bg-amber-100 text-amber-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {{ instruction: '指令', feedback: '反馈', diff: '对比' }[data.taskType]}
                  </span>
                )}
                {data.taskStatus && (
                  <span>{data.taskStatus === 'done' ? '✅' : '⏳'} {data.taskStatus === 'done' ? '完成' : '待处理'}</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Children list */}
        {data.children && data.children.length > 0 && (
          <div className={`border-t ${v.headerBorder} px-3 py-2`}>
            {data.children.slice(0, 5).map((c) => (
              <div key={c.id} className="text-[10px] text-[var(--color-text-tertiary)] truncate">
                · {c.title}
              </div>
            ))}
            {data.children.length > 5 && (
              <div className="text-[9px] text-[var(--color-text-tertiary)]/60 mt-0.5">+{data.children.length - 5} 项</div>
            )}
          </div>
        )}

        {/* Connections badge */}
        {data.linkedCardIds && data.linkedCardIds.length > 0 && (
          <div className="border-t border-[var(--color-border-default)] px-3 py-1.5">
            <span className="text-[9px] text-[var(--color-text-tertiary)]">🔗 {data.linkedCardIds.length}关联</span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </>
  );
});
