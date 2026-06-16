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

interface AddCanvasCardOptions {
  position?: { x: number; y: number };
}

export async function addCanvasCardHandler(
  cardType: CanvasNodeType,
  data: Record<string, unknown>,
  options?: AddCanvasCardOptions,
) {
  const { useCanvasStore } = await import('@drama/stores/canvasStore');
  const { generateId } = await import('@/shared/lib/utils');

  const canvasStore = useCanvasStore.getState();
  const existingCount = canvasStore.getCurrentNodes().length;

  // Grid-based auto-layout to avoid overlap
  const cols = 4;
  const gap = 220;
  const row = Math.floor(existingCount / cols);
  const col = existingCount % cols;
  const jitter = () => Math.floor(Math.random() * 40) - 20;

  const position = options?.position ?? {
    x: 200 + col * gap + jitter(),
    y: 150 + row * 160 + jitter(),
  };

  const card = {
    id: generateId('canvas_'),
    type: cardType,
    position,
    data: { title: (data.title as string) ?? '未命名', ...data },
  };
  canvasStore.addNode(card as import('@drama/types').CanvasNode);
  return card;
}
