/**
 * Project sync service — push/pull projects between IndexedDB and server.
 *
 * Phase 3 enhancements:
 * - Per-project version tracking for conflict detection
 * - Granular push/pull (single project or all)
 * - Structured conflict results for UI resolution
 */
import { useProjectStore } from '../stores/projectStore';
import { useCanvasStore } from '../stores/canvasStore';
import { authApi, useAuthStore } from '@/shared/stores/authStore';
import { config } from '@/shared/config';
import type { TreeNode } from '@/apps/drama/types';

const API_BASE = config.serverBase;

interface ServerProject {
  id: string;
  title: string;
  description: string;
  coverColor: string;
  data: string;   // JSON: { tree, canvas }
  version: number;
  updatedAt: string;
  isPublic: boolean;
}

export interface ConflictInfo {
  projectId: string;
  projectTitle: string;
  localVersion: number;
  remoteVersion: number;
  remoteProject: ServerProject;
}

export interface PushResult {
  success: boolean;
  conflict?: ConflictInfo;
  error?: string;
}

export interface PushAllResult {
  synced: number;
  conflicts: ConflictInfo[];
  errors: string[];
}

export interface PullResult {
  imported: number;
  updated: number;
  errors: string[];
}

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/** Push a single project to the server. */
export async function pushProject(projectId: string): Promise<PushResult> {
  const store = useProjectStore.getState();
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return { success: false, error: 'Project not found' };

  const tree = store.trees[projectId];
  const canvases = useCanvasStore.getState().canvases[projectId];
  const data = JSON.stringify({ tree, canvases });
  const version = project.version ?? 1;

  const headers = getAuthHeaders();

  try {
    const existing = await fetch(`${API_BASE}/api/projects/${projectId}`, { headers });

    if (existing.ok) {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title: project.title,
          description: project.description,
          coverColor: project.coverColor,
          data,
          version,
        }),
      });

      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        const remote = await fetch(`${API_BASE}/api/projects/${projectId}`, { headers });
        const remoteProject: ServerProject | null = remote.ok ? await remote.json() : null;
        return {
          success: false,
          conflict: {
            projectId,
            projectTitle: project.title,
            localVersion: version,
            remoteVersion: body.serverVersion ?? (remoteProject?.version ?? 0),
            remoteProject: remoteProject!,
          },
        };
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.error || `HTTP ${res.status}` };
      }

      // Update local version from server response
      const saved = await res.json();
      if (typeof saved.version === 'number') {
        useProjectStore.getState().updateProject(projectId, { version: saved.version });
      }
      return { success: true };
    } else {
      // Project does not exist on server — create it
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: project.title,
          description: project.description,
          coverColor: project.coverColor,
          data,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.error || `HTTP ${res.status}` };
      }
      const saved = await res.json();
      if (typeof saved.version === 'number') {
        useProjectStore.getState().updateProject(projectId, { version: saved.version });
      }
      return { success: true };
    }
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/** Push all local projects to server. */
export async function pushAll(): Promise<PushAllResult> {
  const projects = useProjectStore.getState().projects;
  const result: PushAllResult = { synced: 0, conflicts: [], errors: [] };

  for (const project of projects) {
    const r = await pushProject(project.id);
    if (r.success) {
      result.synced++;
    } else if (r.conflict) {
      result.conflicts.push(r.conflict);
    } else if (r.error) {
      result.errors.push(`${project.title}: ${r.error}`);
    }
  }

  return result;
}

/** Pull a single project from server and overwrite local data. */
export async function pullProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await authApi.apiCall(`/api/projects/${projectId}`);
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };

    const sp: ServerProject = await res.json();
    const parsed = JSON.parse(sp.data || '{}');

    useProjectStore.setState((s) => {
      const exists = s.projects.find((p) => p.id === sp.id);
      const projects = exists
        ? s.projects.map((p) =>
            p.id === sp.id
              ? { ...p, title: sp.title, description: sp.description, coverColor: sp.coverColor, version: sp.version, updatedAt: sp.updatedAt }
              : p
          )
        : [...s.projects, { id: sp.id, title: sp.title, description: sp.description, coverColor: sp.coverColor, version: sp.version, updatedAt: sp.updatedAt, sceneCount: 0, duration: 0 }];
      return {
        projects,
        trees: { ...s.trees, [sp.id]: parsed.tree ?? s.trees[sp.id] },
      };
    });

    useCanvasStore.setState((s) => ({
      canvases: {
        ...s.canvases,
        [sp.id]: parsed.canvases ?? { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      },
    }));

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/** Pull all server projects. Imports new ones; skips existing (no auto-overwrite). */
export async function pullAll(): Promise<PullResult> {
  const res = await authApi.apiCall('/api/projects');
  if (!res.ok) return { imported: 0, updated: 0, errors: [] };

  const serverProjects: ServerProject[] = await res.json();
  const result: PullResult = { imported: 0, updated: 0, errors: [] };

  for (const sp of serverProjects) {
    const local = useProjectStore.getState().projects.find((p) => p.id === sp.id);
    if (!local) {
      // Import new
      const detailRes = await authApi.apiCall(`/api/projects/${sp.id}`);
      if (!detailRes.ok) {
        result.errors.push(`${sp.title}: fetch detail failed`);
        continue;
      }
      const detail: ServerProject = await detailRes.json();
      const parsed = JSON.parse(detail.data || '{}');
      const projectId = useProjectStore.getState().createProject(detail.title, detail.description, detail.coverColor);
      // createProject generates a new id, but we want the server id
      // So we need to fix the id after creation
      useProjectStore.setState((s) => {
        const created = s.projects[s.projects.length - 1];
        if (created) {
          created.id = detail.id;
          created.version = detail.version;
          created.updatedAt = detail.updatedAt;
        }
        return {
          projects: [...s.projects],
          trees: { ...s.trees, [detail.id]: parsed.tree ?? s.trees[projectId] },
        };
      });
      useCanvasStore.setState((s) => ({
        canvases: {
          ...s.canvases,
          [detail.id]: parsed.canvases ?? { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        },
      }));
      result.imported++;
    } else if ((local.version ?? 0) < sp.version) {
      // Server has newer version — pull it
      const pr = await pullProject(sp.id);
      if (pr.success) result.updated++;
      else result.errors.push(`${sp.title}: ${pr.error}`);
    }
  }

  return result;
}

/** Resolve a conflict by overwriting local data with remote data. */
export async function resolveConflictWithRemote(conflict: ConflictInfo): Promise<void> {
  const parsed = JSON.parse(conflict.remoteProject.data || '{}');

  useProjectStore.setState((s) => ({
    projects: s.projects.map((p) =>
      p.id === conflict.projectId
        ? {
            ...p,
            title: conflict.remoteProject.title,
            description: conflict.remoteProject.description,
            coverColor: conflict.remoteProject.coverColor,
            version: conflict.remoteProject.version,
            updatedAt: conflict.remoteProject.updatedAt,
          }
        : p
    ),
    trees: { ...s.trees, [conflict.projectId]: parsed.tree ?? s.trees[conflict.projectId] },
  }));

  useCanvasStore.setState((s) => ({
    canvases: {
      ...s.canvases,
      [conflict.projectId]: parsed.canvases ?? s.canvases[conflict.projectId],
    },
  }));
}

/** Resolve a conflict by force-pushing local data (bumping version). */
export async function resolveConflictWithLocal(conflict: ConflictInfo): Promise<PushResult> {
  // Bump local version to remote + 1 and retry push
  useProjectStore.getState().updateProject(conflict.projectId, {
    version: conflict.remoteVersion + 1,
  });
  return pushProject(conflict.projectId);
}

/** Resolve a conflict by merging user-selected changes, then push. */
export async function resolveConflictWithMerge(
  conflict: ConflictInfo,
  choices: Record<string, 'local' | 'remote'>
): Promise<PushResult> {
  const parsedRemote = JSON.parse(conflict.remoteProject.data || '{}');
  const localTree = useProjectStore.getState().trees[conflict.projectId];
  const remoteTree = parsedRemote.tree as TreeNode | undefined;

  if (!localTree || !remoteTree) {
    return { success: false, error: 'Missing tree data for merge' };
  }

  const { mergeTrees } = await import('./treeDiff');
  const mergedTree = mergeTrees(localTree, remoteTree, choices);

  // Update local store with merged tree
  useProjectStore.setState((s) => ({
    trees: { ...s.trees, [conflict.projectId]: mergedTree },
    projects: s.projects.map((p) =>
      p.id === conflict.projectId
        ? { ...p, title: conflict.remoteProject.title, version: conflict.remoteVersion + 1, updatedAt: new Date().toISOString() }
        : p
    ),
  }));

  // Also merge canvas if canvas choices provided (simplified: keep local canvas for now)
  // Push merged result
  return pushProject(conflict.projectId);
}
