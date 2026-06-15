/**
 * Shared handler functions — used by both toolRouter and Builder Renderer
 * to write to project/canvas stores.
 */
import { useProjectStore } from '@drama/stores/projectStore';
import { findNode } from './treeUtils';
import type { TreeNode, CanvasNodeType } from '@drama/types';

export function createNodeHandler(
  parentId: string,
  type: TreeNode['type'],
  title: string,
  metadata?: Record<string, unknown>,
): TreeNode {
  const node: TreeNode = {
    id: crypto.randomUUID(),
    type,
    title,
    status: 'draft',
    metadata: {
      ...metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
  useProjectStore.getState().addTreeNode(parentId, node);
  return node;
}

export function updateNodeHandler(nodeId: string, changes: Partial<TreeNode>): void {
  useProjectStore.getState().updateTreeNode(nodeId, changes);
}

export function deleteNodeHandler(nodeId: string): string {
  const store = useProjectStore.getState();
  const tree = store.getCurrentTree();
  const node = tree ? findNode(tree, nodeId) : null;
  const label = node ? `${node.type}「${node.title}」` : nodeId;
  store.deleteTreeNode(nodeId);
  return label;
}

export async function addCanvasCardHandler(
  cardType: CanvasNodeType,
  data: Record<string, unknown>,
) {
  const { useCanvasStore } = await import('@drama/stores/canvasStore');
  const { generateId } = await import('@/shared/lib/utils');
  // Place new card offset from canvas center with slight jitter to avoid exact overlap
  const existingCount = useCanvasStore.getState().nodes.length;
  const offset = 40 * (existingCount % 5);
  const jitter = () => Math.floor(Math.random() * 30) - 15;
  const card = {
    id: generateId('canvas_'),
    type: cardType,
    position: {
      x: 300 + offset + jitter(),
      y: 200 + offset + jitter(),
    },
    data: { title: (data.title as string) ?? '未命名', ...data },
  };
  useCanvasStore.getState().addNode(card as import('@drama/types').CanvasNode);
  return card;
}
