import { walkTree } from '@/apps/drama/lib/treeUtils';
import type { TreeNode } from '@/apps/drama/types';

interface ProjectSummaryProps {
  node: TreeNode;
}

export function ProjectSummary({ node }: ProjectSummaryProps) {
  const counts = { act: 0, scene: 0, shot: 0 };
  walkTree(node, (n) => {
    if (n.type === 'act') counts.act++;
    if (n.type === 'scene') counts.scene++;
    if (n.type === 'shot') counts.shot++;
  });

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-medium text-[var(--color-text-primary)]">{node.title}</h3>
      <p className="text-xs text-[var(--color-text-secondary)]">
        {node.metadata?.description ?? 'No description'}
      </p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-2">
          <div className="text-lg font-semibold text-[var(--color-text-primary)]">{counts.act}</div>
          <div className="text-[10px] text-[var(--color-text-tertiary)]">Acts</div>
        </div>
        <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-2">
          <div className="text-lg font-semibold text-[var(--color-text-primary)]">{counts.scene}</div>
          <div className="text-[10px] text-[var(--color-text-tertiary)]">Scenes</div>
        </div>
        <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-2">
          <div className="text-lg font-semibold text-[var(--color-text-primary)]">{counts.shot}</div>
          <div className="text-[10px] text-[var(--color-text-tertiary)]">Shots</div>
        </div>
      </div>
    </div>
  );
}
