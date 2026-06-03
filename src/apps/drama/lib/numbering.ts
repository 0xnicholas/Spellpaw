import type { TreeNode, CanvasNode } from '@drama/types';

/**
 * Derive display numbers for all objects from the tree structure.
 * Pure function — same input always produces same output.
 *
 * Format:
 *   Tree nodes: "1", "1-1", "1-1-2" (depth-first, root skipped)
 *   Mounted cards: "{treeNum}-{typeCode}{n}" e.g. "1-1-S1"
 *   Free cards: "Free-{typeCode}{n}" e.g. "Free-S1"
 */
export function computeDisplayNumbers(
  tree: TreeNode | null,
  canvasNodes: CanvasNode[]
): Map<string, string> {
  const map = new Map<string, string>();

  if (!tree) return map;

  // —— Phase 1: Walk tree (skip root) ——
  function walk(node: TreeNode, path: number[]) {
    if (node.type !== 'project') {
      map.set(node.id, path.join('-'));
    }
    if (node.children) {
      node.children.forEach((child, index) => {
        walk(child, [...path, index + 1]);
      });
    }
  }
  walk(tree, []);

  // —— Phase 2: Canvas cards ——
  const mountedCounters = new Map<string, number>();
  const freeCounters = new Map<string, number>();

  function getTypeCode(node: CanvasNode): string {
    const type = node.type;
    if (type === 'script') return 'S';
    if (type === 'art') return 'A';
    if (type === 'character') return 'C';
    if (type === 'deliverable') {
      const dt = (node.data.deliverableType as string) ?? 'image';
      const shortCode: Record<string, string> = { image: 'img', video: 'vid', audio: 'aud' };
      return `D-${shortCode[dt] ?? 'img'}`;
    }
    return '';
  }

  for (const node of canvasNodes) {
    const linkedId = node.data.linkedTreeNodeId as string | undefined;
    const treeNumber = linkedId ? map.get(linkedId) : undefined;
    const typeCode = getTypeCode(node);

    if (treeNumber) {
      const counterKey = `${linkedId}::${typeCode}`;
      const count = (mountedCounters.get(counterKey) ?? 0) + 1;
      mountedCounters.set(counterKey, count);
      map.set(node.id, `${treeNumber}-${typeCode}${count}`);
    } else {
      const count = (freeCounters.get(typeCode) ?? 0) + 1;
      freeCounters.set(typeCode, count);
      map.set(node.id, `Free-${typeCode}${count}`);
    }
  }

  return map;
}

/** Convenience: get display number for a single ID from a pre-computed map. */
export function getDisplayNumber(
  map: Map<string, string>,
  internalId: string,
): string {
  return map.get(internalId) ?? '';
}
