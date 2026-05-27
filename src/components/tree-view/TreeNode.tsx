import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TreeNode as TreeNodeType } from '@/types';

interface TreeNodeProps {
  node: TreeNodeType;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-[var(--color-base-gray-400)]',
  in_progress: 'bg-[var(--color-accent-500)]',
  review: 'bg-amber-400',
  done: 'bg-green-500',
};

const typeLabels: Record<string, string> = {
  project: 'Project',
  act: 'Act',
  scene: 'Scene',
  shot: 'Shot',
};

export function TreeNodeItem({ node, depth, selectedId, onSelect, onToggle }: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <button
        onClick={() => onSelect(node.id)}
        className={cn(
          'group flex w-full items-center gap-1.5 py-1 pr-2 text-left transition-colors',
          isSelected
            ? 'bg-[var(--color-accent-50)] text-[var(--color-accent-700)]'
            : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]"
          >
            {node.expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}

        {/* Status dot */}
        <span
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            statusColors[node.status] ?? 'bg-[var(--color-base-gray-400)]'
          )}
        />

        {/* Title */}
        <span className="truncate text-xs">{node.title}</span>

        {/* Type label */}
        <span className="ml-auto shrink-0 text-[10px] text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">
          {typeLabels[node.type]}
        </span>
      </button>

      {/* Children */}
      {hasChildren && node.expanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
