import { useCanvasStore } from '@drama/stores/canvasStore';
import type { CanvasNode } from '@drama/types';

interface ProjectSummaryProps {
  card?: CanvasNode;
}

export function ProjectSummary({ card }: ProjectSummaryProps) {
  const allCards = useCanvasStore.getState().getCurrentNodes();
  const acts = allCards.filter(c => c.type === 'storyline' && c.data.metadata?.type === 'act').length;
  const scenes = allCards.filter(c => c.type === 'sceneCard').length;
  const shots = allCards.reduce((sum, c) => sum + (c.data.children?.length ?? 0), 0);

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-medium text-[var(--color-text-primary)]">{card?.data.title ?? 'Project Summary'}</h3>
      <p className="text-xs text-[var(--color-text-secondary)]">
        {card?.data.description ?? 'No description'}
      </p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-2">
          <div className="text-lg font-semibold text-[var(--color-text-primary)]">{acts}</div>
          <div className="text-[10px] text-[var(--color-text-tertiary)]">Acts</div>
        </div>
        <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-2">
          <div className="text-lg font-semibold text-[var(--color-text-primary)]">{scenes}</div>
          <div className="text-[10px] text-[var(--color-text-tertiary)]">Scenes</div>
        </div>
        <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-2">
          <div className="text-lg font-semibold text-[var(--color-text-primary)]">{shots}</div>
          <div className="text-[10px] text-[var(--color-text-tertiary)]">Shots</div>
        </div>
      </div>
    </div>
  );
}
