import { findNode } from '@/lib/treeUtils';
import { useProjectStore } from '@/stores/projectStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { useDetailStore } from '@/stores/detailStore';
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator';
import { SceneDetailForm } from './SceneDetailForm';
import { ShotDetailForm } from './ShotDetailForm';
import { ProjectSummary } from './ProjectSummary';
import { generateId } from '@/lib/utils';
import type { TreeNode } from '@/types';

export function DetailPanel() {
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const tree = useProjectStore((s) => s.getCurrentTree());
  const updateTreeNode = useProjectStore((s) => s.updateTreeNode);
  const selectNode = useProjectStore((s) => s.selectNode);
  const getCurrentNodes = useCanvasStore((s) => s.getCurrentNodes);
  const addNode = useCanvasStore((s) => s.addNode);
  const setDraftFormData = useDetailStore((s) => s.setDraftFormData);

  const node = selectedNodeId && tree ? findNode(tree, selectedNodeId) : null;

  if (!node) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-xs text-[var(--color-text-tertiary)]">
        Select a scene or shot to edit
      </div>
    );
  }

  const handleChange = (updates: Partial<TreeNode>) => {
    setDraftFormData(updates);
    updateTreeNode(node.id, updates);
    setDraftFormData(null);
  };

  const canvasNodes = getCurrentNodes();
  const hasLinkedCard = canvasNodes.some((n) => n.data.linkedTreeNodeId === node.id);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-3 py-2">
        <span className="text-xs font-medium text-[var(--color-text-primary)]">
          {node.type === 'scene' ? 'Scene Details' : node.type === 'shot' ? 'Shot Details' : 'Project'}
        </span>
        <AutoSaveIndicator />
      </div>
      <div className="flex-1 overflow-auto">
        {node.type === 'scene' && <SceneDetailForm node={node} onChange={handleChange} />}
        {node.type === 'shot' && <ShotDetailForm node={node} onChange={handleChange} />}
        {(node.type === 'project' || node.type === 'act') && <ProjectSummary node={node} />}
      </div>
      {node.type === 'scene' && (
        <button
          onClick={() => {
            if (hasLinkedCard) {
              selectNode(node.id);
            } else {
              addNode({
                id: generateId('canvas_scene_'),
                type: 'sceneCard',
                position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
                data: {
                  title: node.title,
                  description: node.metadata?.description ?? '',
                  status: node.status,
                  linkedTreeNodeId: node.id,
                },
              });
            }
          }}
          className="m-3 rounded-[var(--radius-sm)] bg-[var(--color-accent-500)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--color-accent-600)]"
        >
          {hasLinkedCard ? 'Focus on Canvas' : 'Add to Canvas'}
        </button>
      )}
    </div>
  );
}
