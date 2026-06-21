import { Target } from 'lucide-react';
import { useCanvasStore } from '@drama/stores/canvasStore';

interface ContextBarProps {
  onClick?: () => void;
}

export function ContextBar({ onClick }: ContextBarProps) {
  const selectedCard = useCanvasStore((s) => s.getSelectedCard());

  if (!selectedCard) return null;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-1.5 border-b border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-left transition-colors hover:bg-[var(--color-bg-primary)]"
      title="当前选中的卡片"
    >
      <Target className="h-3 w-3 text-[var(--color-accent-500)]" />
      <span className="text-[11px] text-[var(--color-text-tertiary)]">正在讨论：</span>
      <span className="text-[11px] font-medium text-[var(--color-accent-500)]">
        {selectedCard.data.title}
      </span>
    </button>
  );
}
