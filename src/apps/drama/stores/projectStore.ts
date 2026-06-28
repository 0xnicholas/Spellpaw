import { create } from 'zustand';
import type { Project } from '@drama/types';
import { generateId } from '@/shared/lib/utils';
import { authApi } from '@/shared/stores/authStore';

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;

  setCurrentProject: (id: string) => void;
  createProject: (title: string, description: string, coverColor: string) => string;
  deleteProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deduplicateProjects: () => void;
}


export const useProjectStore = create<ProjectState>()(
  (set, _get) => ({
      projects: [],
      currentProjectId: null,

      setCurrentProject: (id) =>
        set(() => ({ currentProjectId: id })),

      createProject: (title, description, coverColor) => {
        const id = generateId('proj_');
        const now = new Date().toISOString();
        const project: Project = {
          id,
          title,
          description,
          updatedAt: now,
          sceneCount: 0,
          duration: 0,
          coverColor,
          version: 1,
        };
        set((state) => ({
          projects: [...state.projects, project],
          currentProjectId: id,
        }));
        // Persist to server (server is authoritative). Fire-and-forget:
        // the local copy is shown immediately and the server is updated
        // in the background. On 401 (not logged in) or network error
        // we silently keep the local copy — pullAll() on next mount
        // will reconcile when the user comes back.
        void authApi
          .apiCall('/api/projects', {
            method: 'POST',
            body: JSON.stringify({ title, description, coverColor, data: '{}' }),
          })
          .catch(() => {});
        return id;
      },

      deleteProject: (id) =>
        set((state) => {
          const newProjects = state.projects.filter((p) => p.id !== id);
          const newCurrentId = state.currentProjectId === id
            ? (newProjects[0]?.id ?? null)
            : state.currentProjectId;
          // Best-effort server deletion; ignore failures so the UI stays responsive offline.
          authApi.apiCall(`/api/projects/${id}`, { method: 'DELETE' }).catch(() => {});
          return {
            projects: newProjects,
            currentProjectId: newCurrentId,
          };
        }),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        })),

      // Runtime cleanup: remove duplicate projects caused by pullAll() races or migration misses.
      deduplicateProjects: () => {
        set((state) => {
          const projects = state.projects;
          const byId = new Map<string, Project>();
          for (const p of projects) {
            const existing = byId.get(p.id);
            if (!existing || (p.updatedAt && p.updatedAt > existing.updatedAt)) {
              byId.set(p.id, p);
            }
          }
          let deduped = Array.from(byId.values());

          const seedTitleToId: Record<string, string> = {
            '都市奇缘': 'proj_1',
            '密室逃脱': 'proj_2',
          };
          const byTitle = new Map<string, Project[]>();
          for (const p of deduped) {
            const group = byTitle.get(p.title) ?? [];
            group.push(p);
            byTitle.set(p.title, group);
          }
          for (const [title, group] of byTitle) {
            const seedId = seedTitleToId[title];
            if (seedId && group.length > 1) {
              const keeper = group.find((p) => p.id === seedId) ?? group[group.length - 1];
              deduped = deduped.filter((p) => p.title !== title || p.id === keeper.id);
            }
          }

          if (deduped.length === projects.length) return {};
          return { projects: deduped };
        });
      },
    })
);
