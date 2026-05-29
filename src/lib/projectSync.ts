/**
 * Project sync service — push/pull projects between localStorage and server
 */
import { useProjectStore } from '../stores/projectStore';
import { useCanvasStore } from '../stores/canvasStore';
import { authApi, useAuthStore } from '../stores/authStore';
import { config } from '../config';

const API_BASE = config.serverBase;

interface ServerProject {
  id: string;
  title: string;
  description: string;
  coverColor: string;
  data: string;   // JSON: { tree, canvas }
  version: number;
  updatedAt: string;
}

/** Push all local projects to server */
export async function pushAll(): Promise<{ synced: number; errors: string[] }> {
  const store = useProjectStore.getState();
  const projects = store.projects;
  let synced = 0;
  const errors: string[] = [];

  for (const project of projects) {
    try {
      const tree = store.trees[project.id];
      const canvases = useCanvasStore.getState().canvases[project.id];
      const data = JSON.stringify({ tree, canvases });

      const token = useAuthStore.getState().token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const existing = await fetch(`${API_BASE}/api/projects/${project.id}`, { headers });

      if (existing.ok) {
        await fetch(`${API_BASE}/api/projects/${project.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ title: project.title, description: project.description, coverColor: project.coverColor, data, version: 1 }),
        });
      } else {
        await fetch(`${API_BASE}/api/projects`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ title: project.title, description: project.description, coverColor: project.coverColor, data }),
        });
      }
      synced++;
    } catch (err) {
      errors.push(`${project.title}: ${(err as Error).message}`);
    }
  }

  return { synced, errors };
}

/** Pull all server projects to local store */
export async function pullAll(): Promise<{ imported: number }> {
  const res = await authApi.apiCall('/api/projects');
  if (!res.ok) return { imported: 0 };

  const serverProjects: ServerProject[] = await res.json();
  const store = useProjectStore.getState();
  let imported = 0;

  for (const sp of serverProjects) {
    const localProject = store.projects.find(p => p.id === sp.id);
    if (!localProject) {
      // Import new project from server
      try {
        const detailRes = await authApi.apiCall(`/api/projects/${sp.id}`);
        if (detailRes.ok) {
          const detail = await detailRes.json();
          const parsed = JSON.parse(detail.data || '{}');
          const projectId = store.createProject(sp.title, sp.description, sp.coverColor);
          if (parsed.tree) {
            // Store the tree data directly
            useProjectStore.setState((s) => ({
              trees: { ...s.trees, [projectId]: parsed.tree },
            }));
            useCanvasStore.setState((s) => ({
              canvases: {
                ...s.canvases,
                [projectId]: parsed.canvases || { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
              },
            }));
          }
          imported++;
        }
      } catch { /* skip */ }
    }
  }

  return { imported };
}
