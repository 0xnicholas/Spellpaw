import type { TreeNode } from '@drama/types';

export function findNode(root: TreeNode | null, id: string): TreeNode | null {
  if (!root) return null;
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function findParent(root: TreeNode | null, id: string): TreeNode | null {
  if (!root || root.id === id) return null;
  if (root.children) {
    for (const child of root.children) {
      if (child.id === id) return root;
      const found = findParent(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function getSiblings(root: TreeNode | null, id: string): TreeNode[] {
  const parent = findParent(root, id);
  return parent?.children ?? [];
}

export function walkTree(root: TreeNode | null, callback: (node: TreeNode) => void) {
  if (!root) return;
  callback(root);
  root.children?.forEach((child) => walkTree(child, callback));
}

export function collectScenes(root: TreeNode | null): TreeNode[] {
  const scenes: TreeNode[] = [];
  walkTree(root, (node) => {
    if (node.type === 'scene') scenes.push(node);
  });
  return scenes;
}

/** Collect all node IDs in the tree (for metadata validation context). */
export function collectNodeIds(root: TreeNode | null): string[] {
  const ids: string[] = [];
  walkTree(root, (node) => ids.push(node.id));
  return ids;
}
