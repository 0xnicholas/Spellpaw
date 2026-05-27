import { useState, useMemo } from 'react';
import { Search, FolderTree } from 'lucide-react';
import { PanelHeader } from '@/components/ui/PanelHeader';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { TreeNodeItem } from './TreeNode';
import { useProjectStore } from '@/stores/projectStore';
import type { TreeNode } from '@/types';

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

export function TreeViewPanel() {
  const treeData = useProjectStore((s) => s.treeData);
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const selectNode = useProjectStore((s) => s.selectNode);
  const toggleExpanded = useProjectStore((s) => s.toggleExpanded);
  const [query, setQuery] = useState('');

  const displayedTree = useMemo(() => {
    if (!treeData) return null;
    if (!query.trim()) return treeData;
    return filterTree(treeData, query);
  }, [treeData, query]);

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
          />
        ) : (
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title="No matching nodes"
            description="Try other keywords"
          />
        )}
      </div>
    </div>
  );
}
