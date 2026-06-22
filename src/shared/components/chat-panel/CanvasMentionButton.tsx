/**
 * CanvasMentionButton — @ 按钮：让用户从画布上选卡片插入到消息，
 * 消除 Agent 在多 Video/Image/分支变体场景下的目标歧义。
 *
 * 行为：
 *  - 点击打开下拉，列出 useCanvasStore.getCurrentNodes() 的所有卡片
 *  - 每行显示：type 图标 + 标题 + id + type + status
 *  - 选中后：
 *    1. 插入 `@[Title](cardId)` 引用 token + `[引用卡片 ...]` 结构化上下文
 *    2. 调用 onPick(node) 回调 —— workspace 用它来同步 selectedCard 让 contextChip 联动
 *  - 画布为空时下拉内嵌提示（具体由 caller 通过 renderEmpty 控制）
 *
 * 这是 Lab 的 @ 实现抽出来的共享组件，Lab 和 workspace 都用同一份逻辑。
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AtSign } from 'lucide-react';
import { IconButton } from '@/shared/components/ui/IconButton';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { cn } from '@/shared/lib/utils';
import type { CanvasNode } from '@drama/types';

const TYPE_ICON: Record<string, string> = {
  storyline: '📖',
  moodboard: '🎨',
  videoClip: '🎬',
  asset: '📦',
  task: '📋',
  art: '🖼️',
  character: '👤',
  script: '📝',
  deliverable: '📦',
  sceneCard: '🎬',
};

function insertText(detail: string) {
  window.dispatchEvent(new CustomEvent('spellpaw:insert-text', { detail }));
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatMention(node: CanvasNode): string {
  const icon = TYPE_ICON[node.type] ?? '📄';
  const title = node.data.title || node.id;
  const ref = `@[${title}](${node.id})`;
  const ctx = `[引用卡片 ${icon} ${node.type}「${title}」id=${node.id}]`;
  return `${ref} ${ctx}`;
}

export interface CanvasMentionButtonProps {
  /** 选中卡片后的额外回调 —— workspace 用来同步 selectedCard */
  onPick?: (node: CanvasNode) => void;
  /** 画布为空时的自定义内容（不传则用默认提示） */
  renderEmpty?: () => ReactNode;
  /** 图标按钮的 aria-label */
  label?: string;
}

export function CanvasMentionButton({
  onPick,
  renderEmpty,
  label = '@ 引用画布元素',
}: CanvasMentionButtonProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const cards = useCanvasStore((s) => s.getCurrentNodes());

  // 外部点击 + Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (wrapRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handlePick = (node: CanvasNode) => {
    insertText(formatMention(node));
    onPick?.(node);
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <IconButton
        icon={<AtSign className="h-4 w-4" />}
        label={label}
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      />
      {open && (
        <div
          ref={menuRef}
          className={cn(
            'absolute bottom-full left-0 z-50 mb-1 w-72 overflow-hidden rounded-md border border-[var(--color-border-default)]',
            'bg-[var(--color-bg-tertiary)] shadow-lg',
          )}
        >
          <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">
            <span>引用画布元素（{cards.length}）</span>
            <span className="text-[9px] normal-case">@ 消除 Agent 目标歧义</span>
          </div>
          {cards.length === 0 ? (
            renderEmpty ? (
              renderEmpty()
            ) : (
              <div className="px-3 py-3 text-center text-[11px] text-[var(--color-text-tertiary)]">
                当前画布为空。<br />在画布上添加卡片后即可引用。
              </div>
            )
          ) : (
            <div className="max-h-60 overflow-auto">
              {cards.map((node) => {
                const icon = TYPE_ICON[node.type] ?? '📄';
                return (
                  <button
                    key={node.id}
                    onClick={() => handlePick(node)}
                    className="flex w-full items-start gap-2 px-2.5 py-1.5 text-left hover:bg-[var(--color-bg-secondary)]"
                    title={node.data.description ?? node.id}
                  >
                    <span className="shrink-0 text-base leading-none">{icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] text-[var(--color-text-primary)]">
                        {node.data.title || node.id}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--color-text-tertiary)]">
                        <code className="font-mono">{node.id}</code>
                        <span>·</span>
                        <span>{node.type}</span>
                        {node.data.status && (
                          <>
                            <span>·</span>
                            <span>{node.data.status}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}