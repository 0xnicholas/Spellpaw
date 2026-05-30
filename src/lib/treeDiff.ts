import type { TreeNode, CanvasNode } from '@/types';
import { findNode, findParent } from './treeUtils';

export type DiffType = 'added' | 'removed' | 'modified';

export interface NodeDiff {
  nodeId: string;
  type: DiffType;
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  localTitle: string;
  remoteTitle: string;
  nodeType: TreeNode['type'];
  path: string[]; // parent titles for context
}

export interface TreeDiffResult {
  nodeDiffs: NodeDiff[];
  localOnlyCount: number;
  remoteOnlyCount: number;
  modifiedCount: number;
}

/** Flatten tree to id -> node map with parent path info */
function flattenTree(
  root: TreeNode,
  map = new Map<string, { node: TreeNode; path: string[] }>(),
  path: string[] = []
): Map<string, { node: TreeNode; path: string[] }> {
  map.set(root.id, { node: root, path: [...path] });
  for (const child of root.children ?? []) {
    flattenTree(child, map, [...path, root.title]);
  }
  return map;
}

/** Compare two values deeply for equality */
function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!bKeys.includes(key)) return false;
    if (!isEqual(aObj[key], bObj[key])) return false;
  }
  return true;
}

/** Compare metadata fields and return changed field names */
function diffMetadata(
  local: TreeNode['metadata'],
  remote: TreeNode['metadata']
): string[] {
  const changes: string[] = [];
  const allKeys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  for (const key of allKeys) {
    if (!isEqual((local as Record<string, unknown>)?.[key], (remote as Record<string, unknown>)?.[key])) {
      changes.push(key);
    }
  }
  return changes;
}

/** Build human-readable field label */
function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    title: '标题',
    status: '状态',
    duration: '时长',
    description: '描述',
    location: '地点',
    timeOfDay: '时段',
    shotType: '镜头类型',
    cameraMovement: '运镜',
    dialogue: '台词',
    notes: '备注',
    expanded: '展开状态',
  };
  return labels[field] ?? field;
}

/** Compare two trees and return a flat list of differences */
export function diffTrees(localRoot: TreeNode, remoteRoot: TreeNode): TreeDiffResult {
  const localMap = flattenTree(localRoot);
  const remoteMap = flattenTree(remoteRoot);
  const nodeDiffs: NodeDiff[] = [];

  // Find removed (in local but not in remote)
  for (const [id, { node, path }] of localMap) {
    if (id === localRoot.id) continue; // skip root
    if (!remoteMap.has(id)) {
      nodeDiffs.push({
        nodeId: id,
        type: 'removed',
        field: 'node',
        localValue: node,
        remoteValue: null,
        localTitle: node.title,
        remoteTitle: '(已删除)',
        nodeType: node.type,
        path,
      });
    }
  }

  // Find added (in remote but not in local)
  for (const [id, { node, path }] of remoteMap) {
    if (id === remoteRoot.id) continue; // skip root
    if (!localMap.has(id)) {
      nodeDiffs.push({
        nodeId: id,
        type: 'added',
        field: 'node',
        localValue: null,
        remoteValue: node,
        localTitle: '(新增)',
        remoteTitle: node.title,
        nodeType: node.type,
        path,
      });
    }
  }

  // Find modified (in both but different)
  for (const [id, { node: localNode, path }] of localMap) {
    if (id === localRoot.id) continue;
    const remoteEntry = remoteMap.get(id);
    if (!remoteEntry) continue;
    const remoteNode = remoteEntry.node;

    // Check title
    if (localNode.title !== remoteNode.title) {
      nodeDiffs.push({
        nodeId: id,
        type: 'modified',
        field: 'title',
        localValue: localNode.title,
        remoteValue: remoteNode.title,
        localTitle: localNode.title,
        remoteTitle: remoteNode.title,
        nodeType: localNode.type,
        path,
      });
    }

    // Check status
    if (localNode.status !== remoteNode.status) {
      nodeDiffs.push({
        nodeId: id,
        type: 'modified',
        field: 'status',
        localValue: localNode.status,
        remoteValue: remoteNode.status,
        localTitle: localNode.title,
        remoteTitle: remoteNode.title,
        nodeType: localNode.type,
        path,
      });
    }

    // Check expanded
    if (localNode.expanded !== remoteNode.expanded) {
      nodeDiffs.push({
        nodeId: id,
        type: 'modified',
        field: 'expanded',
        localValue: localNode.expanded,
        remoteValue: remoteNode.expanded,
        localTitle: localNode.title,
        remoteTitle: remoteNode.title,
        nodeType: localNode.type,
        path,
      });
    }

    // Check metadata fields
    const metaChanges = diffMetadata(localNode.metadata, remoteNode.metadata);
    for (const field of metaChanges) {
      nodeDiffs.push({
        nodeId: id,
        type: 'modified',
        field,
        localValue: (localNode.metadata as Record<string, unknown>)?.[field],
        remoteValue: (remoteNode.metadata as Record<string, unknown>)?.[field],
        localTitle: localNode.title,
        remoteTitle: remoteNode.title,
        nodeType: localNode.type,
        path,
      });
    }
  }

  // Sort: removed first, then modified, then added; within each group by path
  nodeDiffs.sort((a, b) => {
    const typeOrder = { removed: 0, modified: 1, added: 2 };
    if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
    return a.path.join('/').localeCompare(b.path.join('/'));
  });

  return {
    nodeDiffs,
    localOnlyCount: localMap.size - 1,
    remoteOnlyCount: remoteMap.size - 1,
    modifiedCount: nodeDiffs.filter((d) => d.type === 'modified').length,
  };
}

/** Format a diff value for display */
export function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined) return '(空)';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (value.length > 60) return value.slice(0, 60) + '…';
    if (value === '') return '(空)';
    return value;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value).slice(0, 60);
  }
  return String(value);
}

/** Diff type badge config */
export function diffTypeConfig(type: DiffType) {
  switch (type) {
    case 'added':
      return { label: '新增', color: 'text-[var(--color-success-600)]', bg: 'bg-[var(--color-success-50)]', border: 'border-[var(--color-success-200)]' };
    case 'removed':
      return { label: '删除', color: 'text-[var(--color-error-600)]', bg: 'bg-[var(--color-error-50)]', border: 'border-[var(--color-error-200)]' };
    case 'modified':
      return { label: '修改', color: 'text-[var(--color-warning-600)]', bg: 'bg-[var(--color-warning-50)]', border: 'border-[var(--color-warning-200)]' };
  }
}

/** Build display label for a diff entry */
export function diffDisplayLabel(diff: NodeDiff): string {
  if (diff.type === 'added') return `新增 ${diff.nodeType}「${diff.remoteTitle}」`;
  if (diff.type === 'removed') return `删除 ${diff.nodeType}「${diff.localTitle}」`;
  return `${diff.nodeType}「${diff.localTitle}」${fieldLabel(diff.field)}`;
}

/** Canvas diff result */
export interface CanvasDiffResult {
  addedNodes: CanvasNode[];
  removedNodes: CanvasNode[];
  modifiedNodes: Array<{ id: string; local: CanvasNode; remote: CanvasNode }>;
}

/** Diff two canvas node arrays */
export function diffCanvasNodes(local: CanvasNode[], remote: CanvasNode[]): CanvasDiffResult {
  const localMap = new Map(local.map((n) => [n.id, n]));
  const remoteMap = new Map(remote.map((n) => [n.id, n]));

  const addedNodes: CanvasNode[] = [];
  const removedNodes: CanvasNode[] = [];
  const modifiedNodes: Array<{ id: string; local: CanvasNode; remote: CanvasNode }> = [];

  for (const [id, node] of remoteMap) {
    if (!localMap.has(id)) addedNodes.push(node);
  }

  for (const [id, node] of localMap) {
    if (!remoteMap.has(id)) removedNodes.push(node);
  }

  for (const [id, localNode] of localMap) {
    const remoteNode = remoteMap.get(id);
    if (!remoteNode) continue;
    // Simple comparison: stringify data
    if (JSON.stringify(localNode.data) !== JSON.stringify(remoteNode.data) ||
        localNode.position.x !== remoteNode.position.x ||
        localNode.position.y !== remoteNode.position.y) {
      modifiedNodes.push({ id, local: localNode, remote: remoteNode });
    }
  }

  return { addedNodes, removedNodes, modifiedNodes };
}

/** Deep clone a TreeNode */
function cloneNode(node: TreeNode): TreeNode {
  return JSON.parse(JSON.stringify(node)) as TreeNode;
}

/** Remove a node by id from the tree (mutates root) */
function removeNodeById(root: TreeNode, nodeId: string): boolean {
  if (!root.children) return false;
  const idx = root.children.findIndex((c) => c.id === nodeId);
  if (idx !== -1) {
    root.children.splice(idx, 1);
    return true;
  }
  for (const child of root.children) {
    if (removeNodeById(child, nodeId)) return true;
  }
  return false;
}

/** Apply a single diff choice to a local tree clone (mutates) */
function applyDiffChoice(
  localRoot: TreeNode,
  remoteRoot: TreeNode,
  diff: NodeDiff,
  choice: 'local' | 'remote'
): void {
  if (choice === 'local') return; // nothing to do

  if (diff.type === 'modified') {
    const target = findNode(localRoot, diff.nodeId);
    if (!target) return;
    if (diff.field === 'title') {
      target.title = diff.remoteValue as string;
    } else if (diff.field === 'status') {
      target.status = diff.remoteValue as TreeNode['status'];
    } else if (diff.field === 'expanded') {
      target.expanded = diff.remoteValue as boolean;
    } else {
      // metadata field
      if (!target.metadata) target.metadata = { createdAt: '', updatedAt: '' };
      (target.metadata as Record<string, unknown>)[diff.field] = diff.remoteValue;
    }
  } else if (diff.type === 'added') {
    const remoteNode = diff.remoteValue as TreeNode | null;
    if (!remoteNode) return;
    // Find parent in remote tree
    const remoteParent = findParent(remoteRoot, diff.nodeId);
    if (!remoteParent) return;
    // Find same parent in local tree
    const localParent = findNode(localRoot, remoteParent.id);
    if (!localParent) return;
    if (!localParent.children) localParent.children = [];
    // Avoid duplicates
    if (!localParent.children.some((c) => c.id === remoteNode.id)) {
      localParent.children.push(cloneNode(remoteNode));
    }
  } else if (diff.type === 'removed') {
    removeNodeById(localRoot, diff.nodeId);
  }
}

/** Merge choices into a resolved tree. Returns new tree (does not mutate input). */
export function mergeTrees(
  localRoot: TreeNode,
  remoteRoot: TreeNode,
  choices: Record<string, 'local' | 'remote'>
): TreeNode {
  const result = cloneNode(localRoot);
  const diffs = diffTrees(localRoot, remoteRoot).nodeDiffs;

  for (const diff of diffs) {
    const choice = choices[diff.nodeId] ?? 'local';
    applyDiffChoice(result, remoteRoot, diff, choice);
  }

  return result;
}

/** Re-export findNode and findParent for consumers */
export { findNode, findParent } from './treeUtils';
