import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, FolderTree } from 'lucide-react';
import { PanelHeader } from '@/components/ui/PanelHeader';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog';
import { TreeNodeItem } from './TreeNode';
import { useProjectStore } from '@/stores/projectStore';
import { generateId } from '@/lib/utils';
import type { TreeNode, TreeNode as TreeNodeType } from '@/types';
import type { EditableTitleRef } from '@/components/ui/EditableTitle';

function filterTree(node: TreeNode, query: string): TreeNode | null {
  const match = node.title.toLowerCase().includes(query.toLowerCase());
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
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; childCount: number } | null>(null);
  const titleRefs = useRef<Map<string, EditableTitleRef>>(new Map());

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

  const handleTitleChange = (id: string, title: string) => {
    updateTreeNode(id, { title });
  };

  const handleStatusChange = (id: string, status: TreeNodeType['status']) => {
    updateTreeNode(id, { status });
  };

  const handleAddChild = (parentId: string, parentType: TreeNodeType['type']) => {
    const type = childTypeMap[parentType];
    if (type === 'shot') return; // shots can't have children

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
      <div className="flex-1 overflow-auto py-1">
        {displayedTree ? (
          <TreeNodeItem
            node={displayedTree}
            depth={0}
            selectedId={selectedNodeId}
            onSelect={selectNode}
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
    </div>
  );
}
