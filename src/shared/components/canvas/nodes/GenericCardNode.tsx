import { memo, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { CanvasCard, getCardLabel, getCardTypeConfig } from '../CanvasCard';
import { InlineEditableText } from '../InlineEditableText';
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { CanvasNodeData } from '@drama/types';

export const GenericCardNode = memo(({ data, id, type, selected }: NodeProps<Node<CanvasNodeData>>) => {
  // IMPORTANT: `type` is on the Node (from NodeProps), NOT on data. CanvasNodeData
  // does not have a `type` field. Previously this read `data.type` which is always
  // undefined and caused every card to render the fallback label "卡片".
  const cardType = type ?? (data.type as string | undefined) ?? 'storyline';
  const isPlaceholder = (data as Record<string, unknown>).isPlaceholder as boolean | undefined;
  const PlaceholderIcon = getCardTypeConfig(cardType).icon;
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const description = (data.description as string | undefined) ?? '';
  const isTextCard = cardType === 'storyline' || cardType === 'script';

  // Inline title editing (matches ScriptCardNode for the script type)
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(data.title);

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle.trim() !== data.title) {
      updateNodeData(id, { title: editTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  return (
    <CanvasCard
      type={cardType}
      data={data}
      selected={selected}
      ariaLabel={`${getCardLabel(cardType)}：${data.title}`}
    >
      <Handle type="target" position={Position.Left} />

      {isPlaceholder ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <PlaceholderIcon className="h-6 w-6 text-[var(--color-text-tertiary)]" aria-hidden="true" />
          <span className="mt-2 text-[14px] text-[var(--color-text-tertiary)]">
            Output will appear here...
          </span>
        </div>
      ) : (
        <div className="p-3 space-y-1.5">
          {/* Title (text cards: double-click to edit inline) */}
          {isTextCard && isEditingTitle ? (
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') { setEditTitle(data.title); setIsEditingTitle(false); }
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-primary)] px-1.5 py-0.5 text-[13px] font-medium text-[var(--color-text-primary)] outline-none"
            />
          ) : (
            <h4
              className={`text-[13px] font-medium text-[var(--color-text-primary)] ${isTextCard ? 'cursor-text' : 'truncate'}`}
              onDoubleClick={
                isTextCard
                  ? (e) => { e.stopPropagation(); setEditTitle(data.title); setIsEditingTitle(true); }
                  : undefined
              }
              title={isTextCard ? '双击编辑标题' : undefined}
            >
              {data.title}
            </h4>
          )}

          {/* Inline-editable description for text/script cards */}
          {isTextCard ? (
            <InlineEditableText
              value={description}
              placeholder="点击编辑内容…"
              onSave={(next) => updateNodeData(id, { description: next || undefined })}
            />
          ) : (
            description && (
              <p className="text-[10px] text-[var(--color-text-tertiary)] line-clamp-2">{description}</p>
            )
          )}

          {/* Type-specific data row (kept minimal — colors / counts) */}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--color-text-tertiary)]">
            {cardType === 'storyline' && (
              <>
                {data.sceneCount != null && <span>🎬 {data.sceneCount}场</span>}
                {data.shotCount != null && <span>📷 {data.shotCount}镜</span>}
              </>
            )}
            {cardType === 'moodboard' && (
              <>
                {data.colors && data.colors.length > 0 && (
                  <span className="flex items-center gap-1">
                    {data.colors.slice(0, 5).map((c, i) => (
                      <span
                        key={i}
                        className="inline-block w-3 h-3 rounded-full border border-white/20"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                )}
                {data.images?.length != null && <span>🖼️ {data.images.length}图</span>}
              </>
            )}
            {cardType === 'videoClip' && (
              <>
                {data.source && (
                  <span className={`rounded-full px-1.5 text-[9px] font-medium ${
                    data.source === 'ai' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {data.source === 'ai' ? 'AI' : '上传'}
                  </span>
                )}
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
                  <span>
                    {data.taskStatus === 'done' ? '✅ 完成' : '⏳ 待处理'}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Children list */}
      {data.children && data.children.length > 0 && (
        <div className="px-3 py-2 border-t border-[var(--color-border-default)]">
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

      <Handle type="source" position={Position.Right} />
    </CanvasCard>
  );
});
