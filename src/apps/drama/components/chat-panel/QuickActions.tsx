import { Rocket, PenLine, Palette, Scissors, Image } from 'lucide-react';

const actions = [
  { icon: Rocket, label: '🚀 Kickstart：快速生成初稿' },
  { icon: PenLine, label: '✨ Enhance：展开下一幕' },
  { icon: Scissors, label: '✨ Enhance：优化节奏' },
  { icon: Palette, label: '✨ Enhance：生成视觉风格' },
  { icon: Image, label: '🎨 为当前场景生成 art 卡片' },
];

interface QuickActionsProps {
  onAction?: (label: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2">
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={() => onAction?.(a.label)}
          className="flex items-center gap-1 rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-2.5 py-1 text-[11px] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent-500)] hover:text-[var(--color-accent-500)]"
        >
          <a.icon className="h-3 w-3" />
          {a.label}
        </button>
      ))}
    </div>
  );
}
