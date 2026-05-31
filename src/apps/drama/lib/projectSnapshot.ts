/**
 * Project snapshot service — manual save + compare + rollback
 *
 * Snapshots stored in IndexedDB under 'snapshots' object store.
 */

import { getSpellpawDB } from '@/shared/lib/idbStorage';
import type { TreeNode, CanvasNode, CanvasEdge } from '@drama/types';

const STORE = 'snapshots';

interface SnapshotData {
  tree: TreeNode;
  canvases?: {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
  };
}

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  name: string;
  createdAt: number;
  data: SnapshotData;
}

/** Save a snapshot */
export async function saveSnapshot(
  projectId: string,
  name: string,
  data: SnapshotData,
): Promise<ProjectSnapshot> {
  const db = await getSpellpawDB();
  const snapshot: ProjectSnapshot = {
    id: `${projectId}_${Date.now()}`,
    projectId,
    name,
    createdAt: Date.now(),
    data,
  };
  await db.put(STORE, snapshot);
  return snapshot;
}

/** List all snapshots for a project */
export async function listSnapshots(projectId: string): Promise<ProjectSnapshot[]> {
  const db = await getSpellpawDB();
  const all = await db.getAll(STORE);
  return all
    .filter((s: ProjectSnapshot) => s.projectId === projectId)
    .sort((a: ProjectSnapshot, b: ProjectSnapshot) => b.createdAt - a.createdAt);
}

/** Delete a snapshot */
export async function deleteSnapshot(snapshotId: string): Promise<void> {
  const db = await getSpellpawDB();
  await db.delete(STORE, snapshotId);
}

/** Load snapshot data (for rollback) */
export async function loadSnapshot(snapshotId: string): Promise<ProjectSnapshot | null> {
  const db = await getSpellpawDB();
  return db.get(STORE, snapshotId) as Promise<ProjectSnapshot | null>;
}
