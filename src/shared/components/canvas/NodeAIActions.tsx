import { useState, useRef, useEffect } from 'react';

export interface AIAction {
  label: string;
  prompt: string;
}

interface NodeAIActionsProps {
  actions: AIAction[];
  onAction: (prompt: string) => void;
}

/** Hover-revealed AI button on canvas cards — click to show quick-action menu */
export function NodeAIActions({ actions, onAction }: NodeAIActionsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (actions.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent-50)] text-[10px] text-[var(--color-accent-500)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--color-accent-100)]"
        title="AI 操作"
      >
        ✨
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-50 min-w-[140px] rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] py-1 shadow-lg">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={(e) => { e.stopPropagation(); setOpen(false); onAction(a.prompt); }}
              className="block w-full px-3 py-1.5 text-left text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** AI actions per card type */
export function getCardAIActions(cardType: string, title: string): AIAction[] {
  switch (cardType) {
    case 'sceneCard':
      return [
        { label: '🎨 生成分镜图', prompt: `请为「${title}」生成分镜参考图` },
        { label: '✏️ 改写描述', prompt: `请改写「${title}」的场景描述，使其更有画面感` },
        { label: '🎥 建议镜头', prompt: `请为「${title}」推荐 3 种镜头类型和运镜方式` },
      ];
    case 'art':
      return [
        { label: '🔄 生成变体', prompt: `请为「${title}」生成一个风格变体` },
        { label: '🔒 应用风格', prompt: `请锁定「${title}」的风格，应用到其他场景` },
      ];
    case 'character':
      return [
        { label: '🖼️ 生成立绘', prompt: `请为角色「${title}」生成角色立绘` },
        { label: '📝 扩写性格', prompt: `请扩写角色「${title}」的性格描述和背景故事` },
      ];
    case 'script':
      return [
        { label: '💬 撰写对白', prompt: `请为「${title}」撰写一段自然对白` },
        { label: '✨ 优化脚本', prompt: `请优化「${title}」的脚本，增强戏剧张力` },
      ];
    case 'deliverable':
      return [
        { label: '🔄 重新生成', prompt: `请重新生成产出物「${title}」` },
      ];
    default:
      return [];
  }
}
