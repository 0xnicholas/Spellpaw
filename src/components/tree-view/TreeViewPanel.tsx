import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, FolderTree, Trash2, CheckSquare, Image, Lock, X } from 'lucide-react';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';
import { toolRouter } from '@/stores/toolRouter';
import { PanelHeader } from '@/components/ui/PanelHeader';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog';
import { TreeNodeItem } from './TreeNode';
import { useProjectStore } from '@/stores/projectStore';
import { generateId } from '@/lib/utils';
import { walkTree } from '@/lib/treeUtils';
import type { TreeNode, TreeNode as TreeNodeType } from '@/types';
import type { EditableTitleRef } from '@/components/ui/EditableTitle';

/** Full-text search across title, description, dialogue, location, notes */
function nodeMatches(node: TreeNode, query: string): boolean {
  const q = query.toLowerCase();
  if (node.title.toLowerCase().includes(q)) return true;
  if (node.metadata?.description?.toLowerCase().includes(q)) return true;
  if (node.metadata?.dialogue?.toLowerCase().includes(q)) return true;
  if (node.metadata?.location?.toLowerCase().includes(q)) return true;
  if (node.metadata?.notes?.toLowerCase().includes(q)) return true;
  return false;
}

function filterTree(node: TreeNode, query: string): TreeNode | null {
  const match = nodeMatches(node, query);
  let filteredChildren: TreeNode[] | undefined;
  if (node.children) {
    filteredChildren = node.children
      .map((c) => filterTree(c, query))
      .filter(Boolean) as TreeNode[];
  }
  if (match || (filteredChildren && filteredChildren.length > 0)) {
    return { ...node, children: filteredChildren, expanded: true };
  }
  return null;
}

const childTypeMap: Record<string, TreeNodeType['type']> = {
  project: 'act',
  act: 'scene',
  scene: 'shot',
  shot: 'shot',
};

export function TreeViewPanel() {
  const treeData = useProjectStore((s) => s.getCurrentTree());
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const selectNode = useProjectStore((s) => s.selectNode);
  const toggleExpanded = useProjectStore((s) => s.toggleExpanded);
  const addTreeNode = useProjectStore((s) => s.addTreeNode);
  const deleteTreeNode = useProjectStore((s) => s.deleteTreeNode);
  const updateTreeNode = useProjectStore((s) => s.updateTreeNode);
  const updateNodes = useProjectStore((s) => s.updateNodes);
  const deleteNodes = useProjectStore((s) => s.deleteNodes);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);

  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; childCount: number } | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const titleRefs = useRef<Map<string, EditableTitleRef>>(new Map());
  const { toast, show, hide } = useToast();
  const getLockedStyle = useProjectStore((s) => s.getLockedStyle);
  const clearLockedStyle = useProjectStore((s) => s.clearLockedStyle);

  // Clear multi-selection when project changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentProjectId]);

  // F2 / Cmd+R to rename selected node
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.key === 'F2' || (e.metaKey && e.key === 'r')) &&
        selectedNodeId &&
        document.activeElement === document.body
      ) {
        e.preventDefault();
        titleRefs.current.get(selectedNodeId)?.startEdit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeId]);

  const displayedTree = useMemo(() => {
    if (!treeData) return null;
    if (!query.trim()) return treeData;
    return filterTree(treeData, query);
  }, [treeData, query]);

  const handleSelect = useCallback(
    (id: string, event?: React.MouseEvent) => {
      if (!treeData) return;

      const isCmd = event?.metaKey || event?.ctrlKey;
      const isShift = event?.shiftKey;

      if (isShift && selectedNodeId) {
        // Range selection
        const allIds: string[] = [];
        walkTree(treeData, (node) => allIds.push(node.id));
        const startIdx = allIds.indexOf(selectedNodeId);
        const endIdx = allIds.indexOf(id);
        if (startIdx !== -1 && endIdx !== -1) {
          const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
          const rangeIds = allIds.slice(from, to + 1);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            rangeIds.forEach((iid) => next.add(iid));
            return next;
          });
        }
        selectNode(id);
      } else if (isCmd) {
        // Toggle selection
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
        selectNode(id);
      } else {
        // Single selection
        setSelectedIds(new Set([id]));
        selectNode(id);
      }
    },
    [treeData, selectedNodeId, selectNode]
  );

  const handleTitleChange = (id: string, title: string) => {
    updateTreeNode(id, { title });
  };

  const handleStatusChange = (id: string, status: TreeNodeType['status']) => {
    updateTreeNode(id, { status });
  };

  const handleAddChild = (parentId: string, parentType: TreeNodeType['type']) => {
    const type = childTypeMap[parentType];
    if (type === 'shot') return;

    const newNode: TreeNodeType = {
      id: generateId(`tree_${type}_`),
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      status: 'draft',
    };
    addTreeNode(parentId, newNode);
  };

  const handleDelete = (id: string, childCount: number) => {
    setDeleteTarget({ id, childCount });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteTreeNode(deleteTarget.id);
    setDeleteTarget(null);
  };

  // Bulk actions
  const hasSelection = selectedIds.size > 0;

  const handleBulkStatusChange = (status: TreeNodeType['status']) => {
    updateNodes(Array.from(selectedIds), { status });
  };

  const handleBulkDelete = () => {
    deleteNodes(Array.from(selectedIds));
    setSelectedIds(new Set());
    setShowBulkDelete(false);
  };

  const handleBulkGenerate = useCallback(async () => {
    const targets = Array.from(selectedIds)
      .map((id) => {
        const tree = treeData;
        if (!tree) return null;
        function find(n: TreeNode): TreeNode | null {
          if (n.id === id) return n;
          for (const c of n.children ?? []) {
            const f = find(c);
            if (f) return f;
          }
          return null;
        }
        return find(tree);
      })
      .filter((n): n is TreeNode => !!n && (n.type === 'scene' || n.type === 'shot'));

    if (targets.length === 0) {
      show('请选中至少一个场景或镜头', 'error');
      return;
    }

    const total = targets.length;
    const failed: string[] = [];
    const locked = getLockedStyle();

    for (let i = 0; i < targets.length; i++) {
      const node = targets[i];
      show(`🎨 正在生成 ${i + 1}/${total}: ${node.title}...`, 'info');
      try {
        await toolRouter.generate_storyboard({
          action: 'generate_storyboard',
          nodeId: node.id,
          ...(locked.prompt ? { stylePrompt: locked.prompt } : {}),
        });
        if (i < targets.length - 1) await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        failed.push(node.title);
        show(`❌ ${node.title} 失败: ${(err as Error).message}`, 'error');
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (failed.length === 0) {
      show(`✅ 全部 ${total} 张分镜生成完成`, 'success');
    } else {
      show(`⚠️ ${total - failed.length}/${total} 成功，${failed.length} 个失败`, 'error');
    }
    setSelectedIds(new Set());
  }, [selectedIds, treeData, getLockedStyle, show, setSelectedIds]);

  // eslint-disable-next-line react-hooks/refs
  const titleRefMap = titleRefs.current;

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title="Project Structure"
        icon={<FolderTree className="h-4 w-4" />}
        actions={
          <div className="w-28">
            <Input
              size={1}
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        }
      />

      {/* Bulk action bar */}
      {hasSelection && (
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-3 py-1.5">
          <span className="text-[11px] text-[var(--color-text-secondary)]">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-1.5">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) handleBulkStatusChange(e.target.value as TreeNodeType['status']);
              }}
              className="h-6 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-1.5 text-[10px]"
            >
              <option value="">Set status…</option>
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
            <button
              onClick={handleBulkGenerate}
              className="flex h-6 items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-bg-accent)] px-1.5 text-[10px] font-medium text-[var(--color-text-inverse)] hover:opacity-90 transition-opacity"
            >
              <Image className="h-3 w-3" />
              生成分镜
            </button>
            <button
              onClick={() => setShowBulkDelete(true)}
              className="flex h-6 items-center gap-1 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-1.5 text-[10px] text-red-600 hover:bg-red-100"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded p-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-primary)]"
              title="Clear selection"
            >
              <CheckSquare className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Style lock indicator */}
      {(() => {
        const locked = getLockedStyle();
        if (!locked.prompt) return null;
        return (
          <div className="flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-bg-accent-subtle)] px-3 py-1">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-accent-500)]">
              <Lock className="h-3 w-3" />
              <span>基于风格锁</span>
            </div>
            <button
              onClick={() => { clearLockedStyle(); show('已清除风格锁', 'info'); }}
              className="rounded p-0.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              title="清除风格锁"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })()}

      <div className="flex-1 overflow-auto py-1">
        {displayedTree ? (
          <TreeNodeItem
            node={displayedTree}
            depth={0}
            selectedId={selectedNodeId}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onToggle={toggleExpanded}
            onStatusChange={handleStatusChange}
            onTitleChange={handleTitleChange}
            onAddChild={handleAddChild}
            onDelete={handleDelete}
            titleRefMap={titleRefMap}
          />
        ) : (
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title="No matching nodes"
            description="Try other keywords"
          />
        )}
      </div>

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Node"
        description={
          (deleteTarget?.childCount ?? 0) > 0
            ? `This node has ${deleteTarget?.childCount} children. Delete all?`
            : 'Are you sure you want to delete this node?'
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <DeleteConfirmDialog
        isOpen={showBulkDelete}
        title="Bulk Delete"
        description={`Delete ${selectedIds.size} selected nodes? This cannot be undone.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hide}
        />
      )}
    </div>
  );
}
