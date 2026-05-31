import { useState, useEffect, useCallback } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { findNode } from '@drama/lib/treeUtils';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useDetailStore } from '@drama/stores/detailStore';
import type { TreeNode } from '@drama/types';
import { SceneDetailForm } from './SceneDetailForm';
import { ShotDetailForm } from './ShotDetailForm';
import { ProjectActDetailForm } from './ProjectActDetailForm';
import { AnalysisReport } from './AnalysisReport';
import { generateId } from '@/shared/lib/utils';

export function DetailPanel() {
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const tree = useProjectStore((s) => s.getCurrentTree());
  const updateTreeNode = useProjectStore((s) => s.updateTreeNode);
  const requestFocusCanvas = useDetailStore((s) => s.requestFocusCanvas);
  const getCurrentNodes = useCanvasStore((s) => s.getCurrentNodes);
  const addNode = useCanvasStore((s) => s.addNode);

  const node = selectedNodeId && tree ? findNode(tree, selectedNodeId) : null;

  // Draft state
  const [draft, setDraft] = useState<Partial<TreeNode>>({});
  const [dirty, setDirty] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // Reset draft when node changes
  useEffect(() => {
    setDraft({});
    setDirty(false);
    setFormKey((k) => k + 1);
  }, [node?.id]);

  const handleDraftChange = useCallback((updates: Partial<TreeNode>) => {
    setDraft((prev) => {
      const next = { ...prev };
      if ('title' in updates) next.title = updates.title;
      if ('status' in updates) next.status = updates.status;
      if (updates.metadata) {
        next.metadata = { ...(prev.metadata ?? {}), ...updates.metadata };
      }
      return next;
    });
    setDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!node || !dirty) return;
    const updates: Partial<TreeNode> = {};
    if (draft.title !== undefined && draft.title !== node.title) {
      updates.title = draft.title;
    }
    if (draft.status !== undefined && draft.status !== node.status) {
      updates.status = draft.status;
    }
    if (draft.metadata) {
      const metaUpdates: Record<string, unknown> = {};
      const fields = ['description', 'duration', 'location', 'timeOfDay', 'shotType', 'cameraMovement', 'dialogue', 'notes'];
      for (const field of fields) {
        const draftVal = (draft.metadata as Record<string, unknown> | undefined)?.[field];
        const nodeVal = (node.metadata as Record<string, unknown> | undefined)?.[field];
        if (draftVal !== nodeVal) {
          metaUpdates[field] = draftVal;
        }
      }
      if (Object.keys(metaUpdates).length > 0) {
        updates.metadata = {
          ...node.metadata,
          ...metaUpdates,
          createdAt: node.metadata?.createdAt ?? '',
          updatedAt: new Date().toISOString(),
        } as TreeNode['metadata'];
      }
    }
    if (Object.keys(updates).length > 0) {
      updateTreeNode(node.id, updates);
    }
    setDraft({});
    setDirty(false);
    setFormKey((k) => k + 1);
  }, [node, draft, dirty, updateTreeNode]);

  const handleDiscard = useCallback(() => {
    setDraft({});
    setDirty(false);
    setFormKey((k) => k + 1);
  }, []);

  const canvasNodes = getCurrentNodes();
  const hasLinkedCard = node ? canvasNodes.some((n) => n.data.linkedTreeNodeId === node.id) : false;

  if (!node) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-xs text-[var(--color-text-tertiary)]">
        选择一个节点以编辑
      </div>
    );
  }

  const typeLabel = node.type === 'scene' ? '场景' : node.type === 'shot' ? '镜头' : node.type === 'act' ? '幕' : '项目';

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-3 py-2">
        <span className="text-xs font-medium text-[var(--color-text-primary)]">
          {typeLabel}详情
        </span>
        {dirty && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-amber-500">未保存</span>
            <button
              onClick={handleSave}
              className="flex h-6 items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-accent-500)] px-2 text-[10px] font-medium text-white hover:bg-[var(--color-accent-600)]"
            >
              <Save className="h-3 w-3" />
              保存
            </button>
            <button
              onClick={handleDiscard}
              className="flex h-6 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-2 text-[10px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)]"
            >
              <RotateCcw className="h-3 w-3" />
              放弃
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {node.type === 'scene' && (
          <SceneDetailForm key={formKey} node={node} onChange={handleDraftChange} />
        )}
        {node.type === 'shot' && (
          <ShotDetailForm key={formKey} node={node} onChange={handleDraftChange} />
        )}
        {(node.type === 'project' || node.type === 'act') && (
          <ProjectActDetailForm key={formKey} node={node} onChange={handleDraftChange} />
        )}
        {node.type === 'project' && tree && (
          <div className="px-4 pb-4">
            <AnalysisReport tree={tree} />
          </div>
        )}
      </div>

      {node.type === 'scene' && (
        <button
          onClick={() => {
            if (hasLinkedCard) {
              requestFocusCanvas(node.id);
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
          {hasLinkedCard ? '定位到画布' : '添加到画布'}
        </button>
      )}
    </div>
  );
}
