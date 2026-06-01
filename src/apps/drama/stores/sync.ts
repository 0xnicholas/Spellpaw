/**
 * Bidirectional sync between projectStore (tree) and canvasStore (canvas).
 *
 * Uses Zustand subscribe to watch for mutations in both stores and propagate
 * changes bidirectionally. Avoids circular import issues by doing all sync
 * logic externally — stores don't import this module.
 *
 * Guards: syncGuard prevents infinite loops when stores update each other.
 */
import { useProjectStore } from './projectStore';
import { useCanvasStore } from './canvasStore';
import { diffScenes, computeScenePosition } from '@drama/lib/canvasLayout';
import type { TreeNode } from '@drama/types';

let syncGuard = false;
let lastProcessedTime = 0;
const DEBOUNCE_MS = 100;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function collectLinkedFieldChanges(
  oldNode: TreeNode | null,
  newNode: TreeNode | null,
): { title?: string; status?: string; description?: string } | null {
  if (!oldNode || !newNode) return null;
  const changes: { title?: string; status?: string; description?: string } = {};
  if (newNode.title !== oldNode.title) changes.title = newNode.title;
  if (newNode.status !== oldNode.status) changes.status = newNode.status;
  const oldDesc = oldNode.metadata?.description;
  const newDesc = newNode.metadata?.description;
  if (newDesc !== oldDesc) changes.description = newDesc;
  return Object.keys(changes).length > 0 ? changes : null;
}

function findNodeById(root: TreeNode | null, id: string): TreeNode | null {
  if (!root) return null;
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

// Track previous tree state for diffing
let prevTree: TreeNode | null = null;
const prevCanvasNodes: Map<string, { title: string; status: string; description?: string; linkedTreeNodeId?: string }> = new Map();

// Canvas → Tree: when canvas card changes, push to linked tree node
useCanvasStore.subscribe((state) => {
  if (syncGuard) return;

  const projectId = useProjectStore.getState().currentProjectId;
  if (!projectId) return;

  const nodes = state.canvases[projectId]?.nodes ?? [];

  // Phase 3: tree/canvas decoupled — sync disabled
  // eslint-disable-next-line no-constant-condition
  if (true) return;

  for (const node of nodes) {
    const prev = prevCanvasNodes.get(node.id);
    if (!prev) continue;

    if (
      node.data.linkedTreeNodeId &&
      (node.data.title !== prev.title ||
        node.data.status !== prev.status ||
        node.data.description !== prev.description)
    ) {
      syncGuard = true;
      useProjectStore.getState().updateTreeNode(node.data.linkedTreeNodeId, {
        title: node.data.title !== prev.title ? node.data.title : undefined,
        status: node.data.status !== prev.status ? node.data.status : undefined,
        metadata: node.data.description !== prev.description
          ? { description: node.data.description }
          : undefined,
      } as Partial<TreeNode>);
      syncGuard = false;
    }
  }

  // Update snapshot
  prevCanvasNodes.clear();
  for (const node of nodes) {
    prevCanvasNodes.set(node.id, {
      title: node.data.title,
      status: node.data.status ?? '',
      description: node.data.description,
      linkedTreeNodeId: node.data.linkedTreeNodeId,
    });
  }
});

// Tree → Canvas: when tree node changes, push to linked canvas card
useProjectStore.subscribe((state) => {
  if (syncGuard) return;

  const now = Date.now();
  if (now - lastProcessedTime < DEBOUNCE_MS) return;
  lastProcessedTime = now;

  const tree = state.getCurrentTree();
  if (!tree || !prevTree) {
    prevTree = deepClone(tree);
    return;
  }

  const projectId = state.currentProjectId;
  if (!projectId) return;

  const cs = useCanvasStore.getState();
  const canvasNodes = cs.canvases[projectId]?.nodes ?? [];

  // Phase 3: tree/canvas decoupled — sync disabled
  // eslint-disable-next-line no-constant-condition
  if (true) return;

  // 1. Field-level sync: title / status / description
  for (const card of canvasNodes) {
    const linkedId = card.data.linkedTreeNodeId;
    if (!linkedId) continue;

    const oldTreeNode = findNodeById(prevTree, linkedId);
    const newTreeNode = findNodeById(tree, linkedId);
    const changes = collectLinkedFieldChanges(oldTreeNode, newTreeNode);
    if (changes) {
      syncGuard = true;
      const cu: Record<string, unknown> = {};
      if (changes.title !== undefined) cu.title = changes.title;
      if (changes.status !== undefined) cu.status = changes.status;
      if (changes.description !== undefined) cu.description = changes.description;
      cs.updateNodeData(card.id, cu as Record<string, unknown>);
      syncGuard = false;
    }
  }

  // 2. Node-level sync: detect added / removed scene nodes
  const { added, removed } = diffScenes(prevTree, tree);

  for (const scene of added) {
    const pos = computeScenePosition(tree, scene.id);
    syncGuard = true;
    cs.addNode({
      id: `canvas_scene_${scene.id}`,
      type: 'sceneCard',
      position: pos,
      data: {
        title: scene.title,
        description: scene.metadata?.description ?? '',
        status: scene.status,
        linkedTreeNodeId: scene.id,
      },
    });
    syncGuard = false;
  }

  for (const removedId of removed) {
    const canvasNode = canvasNodes.find((n) => n.data.linkedTreeNodeId === removedId);
    if (canvasNode) {
      syncGuard = true;
      cs.removeNode(canvasNode.id);
      syncGuard = false;
    }
  }

  prevTree = deepClone(tree);
});
