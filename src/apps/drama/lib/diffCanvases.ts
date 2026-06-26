/**
 * diffCanvases — compares two canvas snapshots for SnapshotModal comparison UI.
 *
 * Replaces the deleted diffTrees (which compared TreeNode trees).
 * Operates on full snapshot data (cards + edges).
 */
import type { CanvasNode } from '@drama/types';

export interface CanvasDiff {
  added: CanvasNode[];
  removed: CanvasNode[];
  modified: Array<{ base: CanvasNode; current: CanvasNode; changes: string[] }>;
}

export function diffCanvases(
  base: { cards: CanvasNode[] },
  current: { cards: CanvasNode[] },
): CanvasDiff {
  const baseMap = new Map(base.cards.map((c) => [c.id, c]));
  const currentMap = new Map(current.cards.map((c) => [c.id, c]));
  const added: CanvasNode[] = [];
  const removed: CanvasNode[] = [];
  const modified: CanvasDiff['modified'] = [];

  for (const c of current.cards) {
    const b = baseMap.get(c.id);
    if (!b) {
      added.push(c);
      continue;
    }
    const changes: string[] = [];
    if (b.data.title !== c.data.title) changes.push('title');
    if (b.data.description !== c.data.description) changes.push('description');
    if (b.data.status !== c.data.status) changes.push('status');
    if (b.position.x !== c.position.x || b.position.y !== c.position.y) changes.push('position');
    if (JSON.stringify(b.data.children ?? []) !== JSON.stringify(c.data.children ?? [])) changes.push('children');
    if (changes.length > 0) modified.push({ base: b, current: c, changes });
  }

  for (const b of base.cards) {
    if (!currentMap.has(b.id)) removed.push(b);
  }

  return { added, removed, modified };
}
