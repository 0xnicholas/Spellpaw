import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, FolderTree, Trash2, CheckSquare, Image, Lock, X, Wand2 } from 'lucide-react';
import { Toast } from '@/shared/components/ui/Toast';
import { useToast } from '@/shared/components/ui/useToast';
import { toolRouter } from '@drama/stores/toolRouter';
import { PanelHeader } from '@/shared/components/ui/PanelHeader';
import { Input } from '@/shared/components/ui/Input';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { DeleteConfirmDialog } from '@drama/components/modals/DeleteConfirmDialog';
import { BatchStyleDialog } from '@drama/components/modals/BatchStyleDialog';
import { TreeNodeItem } from './TreeNode';
import { useProjectStore } from '@drama/stores/projectStore';
import { generateId } from '@/shared/lib/utils';
import { walkTree } from '@drama/lib/treeUtils';
import type { TreeNode, TreeNode as TreeNodeType } from '@drama/types';
import type { EditableTitleRef } from '@/shared/components/ui/EditableTitle';

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
  const currentProjectId = useProjectStore((s) => s.currentProjectId);

  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; childCount: number } | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showBatchStyle, setShowBatchStyle] = useState(false);
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

    const labels: Record<TreeNodeType['type'], string> = {
      project: '项目',
      act: '幕',
      scene: '场景',
      shot: '镜头',
    };
    const newNode: TreeNodeType = {
      id: generateId(`tree_${type}_`),
      type,
      title: `新${labels[type]}`,
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
    for (const id of selectedIds) {
      updateTreeNode(id, { status });
    }
  };

  const handleBulkDelete = () => {
    for (const id of selectedIds) {
      deleteTreeNode(id);
    }
    setSelectedIds(new Set());
    setShowBulkDelete(false);
  };

  const handleBatchStyle = useCallback(
    async (stylePrompt: string) => {
      setShowBatchStyle(false);
      const nodeIds = Array.from(selectedIds);
      show(`🎨 正在为 ${nodeIds.length} 个节点应用「${stylePrompt}」风格...`, 'info');
      try {
        await toolRouter.batch_apply_style({
          action: 'batch_apply_style',
          nodeIds,
          stylePrompt,
        });
        show('✅ 批量风格迁移已启动', 'success');
      } catch (err) {
        show(`❌ 批量风格迁移失败: ${(err as Error).message}`, 'error');
      }
    },
    [selectedIds, show],
  );

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
        const msg = (err as Error).message;
        failed.push(node.title);
        show(`❌ ${node.title} 失败: ${msg}`, 'error');
        // Stop early on API key or configuration errors
        if (msg.includes('API key') || msg.includes('not configured')) {
          show('⚠️ 配置错误，已停止生成', 'error');
          break;
        }
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
        title="项目结构"
        icon={<FolderTree className="h-4 w-4" />}
        actions={
          <div className="w-28">
            <Input
              size={1}
              placeholder="搜索…"
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
          <span className="shrink-0 whitespace-nowrap text-[11px] text-[var(--color-text-secondary)]">
            {selectedIds.size} 已选中
          </span>
          <div className="flex items-center gap-1.5">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) handleBulkStatusChange(e.target.value as TreeNodeType['status']);
              }}
              className="h-6 shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-1.5 text-[10px]"
            >
              <option value="">设置状态…</option>
              <option value="draft">草稿</option>
              <option value="in_progress">进行中</option>
              <option value="review">审核中</option>
              <option value="done">已完成</option>
            </select>
            <button
              onClick={handleBulkGenerate}
              className="flex h-6 shrink-0 items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-bg-accent)] px-1.5 text-[10px] font-medium text-[var(--color-text-inverse)] hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Image className="h-3 w-3" />
              生成分镜
            </button>
            <button
              onClick={() => setShowBatchStyle(true)}
              className="flex h-6 shrink-0 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-1.5 text-[10px] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors whitespace-nowrap"
            >
              <Wand2 className="h-3 w-3" />
              统一风格
            </button>
            <button
              onClick={() => setShowBulkDelete(true)}
              className="flex h-6 shrink-0 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-status-danger-bg)] bg-[var(--color-status-danger-bg)] px-1.5 text-[10px] text-[var(--color-status-danger-text)] hover:opacity-80 whitespace-nowrap"
            >
              <Trash2 className="h-3 w-3" />
              删除
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="shrink-0 rounded p-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-primary)]"
              title="清除选择"
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
            title="未找到匹配的节点"
            description="尝试其他关键词"
          />
        )}
      </div>

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        title="删除节点"
        description={
          (deleteTarget?.childCount ?? 0) > 0
            ? `该节点包含 ${deleteTarget?.childCount} 个子节点，确认全部删除？`
            : '确认删除该节点？'
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <DeleteConfirmDialog
        isOpen={showBulkDelete}
        title="批量删除"
        description={`删除 ${selectedIds.size} 个已选中的节点？此操作不可撤销。`}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
      />

      <BatchStyleDialog
        isOpen={showBatchStyle}
        count={selectedIds.size}
        onConfirm={handleBatchStyle}
        onCancel={() => setShowBatchStyle(false)}
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
