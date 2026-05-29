import { forwardRef, useRef } from 'react';
import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditableTitle, type EditableTitleRef } from '@/components/ui/EditableTitle';
import { Tooltip } from '@/components/ui/Tooltip';
import type { TreeNode as TreeNodeType } from '@/types';

interface TreeNodeProps {
  node: TreeNodeType;
  depth: number;
  selectedId: string | null;
  selectedIds?: Set<string>;
  onSelect: (id: string, event?: React.MouseEvent) => void;
  onToggle: (id: string) => void;
  onStatusChange?: (id: string, status: TreeNodeType['status']) => void;
  onTitleChange?: (id: string, title: string) => void;
  onAddChild?: (parentId: string, type: TreeNodeType['type']) => void;
  onDelete?: (id: string, childCount: number) => void;
  dragHandleProps?: Record<string, unknown>;
  titleRefMap?: Map<string, EditableTitleRef>;
}

const statusColors: Record<string, string> = {
  draft: 'bg-[var(--color-base-gray-400)]',
  in_progress: 'bg-[var(--color-accent-500)]',
  review: 'bg-amber-400',
  done: 'bg-green-500',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const nextStatus: Record<string, TreeNodeType['status']> = {
  draft: 'in_progress',
  in_progress: 'review',
  review: 'done',
  done: 'draft',
};

const typeLabels: Record<string, string> = {
  project: 'Project',
  act: 'Act',
  scene: 'Scene',
  shot: 'Shot',
};

const childTypeMap: Record<string, TreeNodeType['type']> = {
  project: 'act',
  act: 'scene',
  scene: 'shot',
  shot: 'shot', // not used (no children for shot)
};

export const TreeNodeItem = forwardRef<HTMLDivElement, TreeNodeProps>(
  ({ node, depth, selectedId, selectedIds, onSelect, onToggle, onStatusChange, onTitleChange, onAddChild, onDelete, dragHandleProps, titleRefMap }, ref) => {
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedId === node.id;
    const isMultiSelected = selectedIds?.has(node.id) ?? false;
    const titleRef = useRef<EditableTitleRef>(null);

    // Register title ref
    if (titleRefMap && !titleRefMap.has(node.id)) {
      titleRefMap.set(node.id, titleRef as unknown as EditableTitleRef);
    }

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(node.id, e);
    };

    const canHaveChildren = node.type !== 'shot';

    return (
      <div ref={ref}>
        <button
          onClick={(e) => onSelect(node.id, e)}
          onContextMenu={handleContextMenu}
          className={cn(
            'group flex w-full items-center gap-1.5 py-1 pr-2 text-left transition-colors',
            isSelected || isMultiSelected
              ? 'bg-[var(--color-accent-50)] text-[var(--color-accent-700)]'
              : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]',
            isMultiSelected && !isSelected && 'ring-1 ring-inset ring-[var(--color-accent-200)]'
          )}
          style={{ paddingLeft: `${depth * 16 + 4}px` }}
        >
          {/* Drag handle */}
          <span
            className="flex h-4 w-4 shrink-0 cursor-grab items-center justify-center text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100"
            {...(dragHandleProps ?? {})}
          >
            <GripVertical className="h-3 w-3" />
          </span>

          {/* Expand toggle */}
          {hasChildren ? (
            <span
              onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
              className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]"
            >
              {node.expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </span>
          ) : (
            <span className="h-4 w-4 shrink-0" />
          )}

          {/* Status dot with tooltip */}
          <Tooltip content={statusLabels[node.status]}>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange?.(node.id, nextStatus[node.status]);
              }}
              className={cn('h-1.5 w-1.5 shrink-0 rounded-full cursor-pointer', statusColors[node.status])}
            />
          </Tooltip>

          {/* Editable title */}
          <span className="truncate text-xs">
            <EditableTitle
              ref={titleRef}
              value={node.title}
              onSave={(newTitle) => onTitleChange?.(node.id, newTitle)}
            />
          </span>

          {/* Type label + child actions on hover */}
          <div className="ml-auto flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canHaveChildren && node.type !== 'shot' && (
              <span
                onClick={(e) => { e.stopPropagation(); onAddChild?.(node.id, node.type); }}
                className="cursor-pointer rounded px-1 text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-500)]"
                title={`Add ${childTypeMap[node.type]}`}
              >
                +
              </span>
            )}
            <span
              onClick={(e) => { e.stopPropagation(); onDelete?.(node.id, node.children?.length ?? 0); }}
              className="cursor-pointer rounded px-1 text-[10px] text-[var(--color-text-tertiary)] hover:text-red-500"
              title="Delete"
            >
              ×
            </span>
            <span className="text-[10px] text-[var(--color-text-tertiary)]">
              {typeLabels[node.type]}
            </span>
          </div>
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
                selectedIds={selectedIds}
                onSelect={onSelect}
                onToggle={onToggle}
                onStatusChange={onStatusChange}
                onTitleChange={onTitleChange}
                onAddChild={onAddChild}
                onDelete={onDelete}
                titleRefMap={titleRefMap}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

TreeNodeItem.displayName = 'TreeNodeItem';
