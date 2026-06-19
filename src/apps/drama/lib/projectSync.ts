/**
 * Project sync service — push/pull projects between IndexedDB and server.
 *
 * The server acts as a cloud backup: the latest local state is always accepted.
 */
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { authApi, useAuthStore } from '@/shared/stores/authStore';
import { config } from '@/shared/config';
import type { Project } from '@drama/types';

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

export interface PushResult {
  success: boolean;
  error?: string;
}

export interface PushAllResult {
  synced: number;
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
          updatedAt: project.updatedAt,
        }),
      });

      if (res.status === 409) {
        // Server has a newer version. Pull the server state and overwrite local.
        const pulled = await pullProject(projectId);
        return { success: pulled.success, error: pulled.error };
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
  const result: PushAllResult = { synced: 0, errors: [] };

  for (const project of projects) {
    const r = await pushProject(project.id);
    if (r.success) {
      result.synced++;
    } else if (r.error) {
      result.errors.push(`${project.title}: ${r.error}`);
    }
  }

  return result;
}

/** Pull a single project from server; only overwrite local if server is newer. */
export async function pullProject(projectId: string): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  try {
    const res = await authApi.apiCall(`/api/projects/${projectId}`);
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };

    const sp: ServerProject = await res.json();
    const parsed = JSON.parse(sp.data || '{}');

    const local = useProjectStore.getState().projects.find((p) => p.id === projectId);
    const serverTime = new Date(sp.updatedAt).getTime();
    const localTime = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0;

    // Local is newer or equal: keep local, but still refresh metadata like version.
    if (local && localTime >= serverTime) {
      useProjectStore.setState((s) => ({
        projects: s.projects.map((p) =>
          p.id === projectId ? { ...p, version: sp.version } : p
        ),
      }));
      return { success: true, skipped: true };
    }

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

      useProjectStore.setState((s) => {
        // Defensive: concurrent pulls or re-runs may race; skip if already imported.
        if (s.projects.find((p) => p.id === detail.id)) {
          return {};
        }
        const newProject: Project = {
          id: detail.id,
          title: detail.title,
          description: detail.description,
          coverColor: detail.coverColor,
          version: detail.version,
          updatedAt: detail.updatedAt,
          sceneCount: 0,
          duration: 0,
        };
        return {
          projects: [...s.projects, newProject],
          trees: { ...s.trees, [detail.id]: parsed.tree ?? null },
        };
      });
      useCanvasStore.setState((s) => ({
        canvases: {
          ...s.canvases,
          [detail.id]: parsed.canvases ?? { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        },
      }));
      result.imported++;
    } else {
      // Last-write-wins: pullProject only overwrites local when server is newer.
      const pr = await pullProject(sp.id);
      if (pr.success) {
        if (pr.skipped) result.errors.push(`${sp.title}: local is newer, skipped pull`);
        else result.updated++;
      } else {
        result.errors.push(`${sp.title}: ${pr.error}`);
      }
    }
  }

  return result;
}
