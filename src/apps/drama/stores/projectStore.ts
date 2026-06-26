import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project } from '@drama/types';
import { generateId } from '@/shared/lib/utils';
import { createIDBStorage } from '@/shared/lib/idbStorage';
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

function bumpProjectUpdatedAt(state: ProjectState): void {
  const id = state.currentProjectId;
  if (!id) return;
  const idx = state.projects.findIndex((p) => p.id === id);
  if (idx !== -1) {
    state.projects[idx] = { ...state.projects[idx], updatedAt: new Date().toISOString() };
  }
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
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
    }),
    {
      name: 'spellpaw_project',
      version: 6,
      storage: createIDBStorage<ProjectState>('projectStore'),
      migrate: (persistedState: unknown, version) => {
        const state = persistedState as Record<string, unknown>;
        if (version < 6) {
          delete state.trees;
          delete state.selectedNodeId;
        }
        if (version < 2) {
          function fillMeta(node: any) {
            if (!node.metadata) {
              node.metadata = { createdAt: '', updatedAt: '' };
            }
            node.metadata.duration ??= 0;
            node.metadata.createdAt ??= new Date().toISOString();
            node.metadata.updatedAt ??= new Date().toISOString();
            node.children?.forEach((c: any) => fillMeta(c));
          }
          // Handle old format: treeData at top level
          if (state.treeData && !state.trees) {
            const tree = state.treeData as any;
            fillMeta(tree);
            state.trees = { [state.currentProjectId as string ?? 'default']: tree };
            delete state.treeData;
          }
          // Also handle if trees already exists (new format)
          if (state.trees) {
            const trees = state.trees as Record<string, any>;
            for (const key of Object.keys(trees)) {
              fillMeta(trees[key]);
            }
          }
        }
        if (version < 3) {
          // Translate mock project data from English to Chinese
          const titleMap: Record<string, string> = {
            'Urban Serendipity': '都市奇缘',
            'Act 1: The Encounter': '第一幕：相遇',
            'Scene 1-1: Cafe Encounter': '场景 1-1：咖啡厅邂逅',
            'Shot 1: Establishing wide': '镜头 1： establishing wide',
            'Shot 2: Male lead close-up': '镜头 2：男主特写',
            'Shot 3: Female lead reaction': '镜头 3：女主反应',
            'Scene 1-2: Street Encounter': '场景 1-2：街头重逢',
            'Shot 1: Tracking shot': '镜头 1：跟踪镜头',
            'Shot 2: Eye contact close-up': '镜头 2：眼神交汇特写',
            'Act 2: The Misunderstanding': '第二幕：误会',
            'Scene 2-1: Office Corridor': '场景 2-1：办公室走廊',
            'Shot 1: Corridor wide': '镜头 1：走廊全景',
            'Shot 2: Overheard conversation': '镜头 2：偷听到的对话',
            'Scene 2-2: Confrontation in the Rain': '场景 2-2：雨中对峙',
            'Shot 1: Rainy wide shot': '镜头 1：雨景 wide',
            'Shot 2: Confrontation shot/reverse shot': '镜头 2：正反打对峙',
            'Shot 3: Turning away silhouette': '镜头 3：转身离去剪影',
            'Act 3: Reconciliation': '第三幕：和解',
            'Scene 3-1: Rooftop Confession': '场景 3-1：天台告白',
            'Shot 1: Rooftop wide': '镜头 1：天台全景',
            'Shot 2: Male lead monologue': '镜头 2：男主独白',
            'Shot 3: Female lead approaches': '镜头 3：女主走近',
            'Shot 4: Embrace close-up': '镜头 4：拥抱特写',
          };
          const descMap: Record<string, string> = {
            'An urban white-collar romance short drama': '一部都市白领爱情短剧',
            'The leads meet for the first time at a cafe': '男女主角在咖啡厅初次相遇',
            'They meet again on the street, tension in the air': '他们在街头再次相遇，空气中弥漫着紧张感',
            'The key scene where the misunderstanding unfolds': '误会发生的关键场景',
            'An intense confrontation in the rain, emotions erupt': '雨中激烈对峙，情绪爆发',
            'A romantic rooftop confession, the misunderstanding is resolved': '浪漫的天台告白，误会解开',
          };
          if (state.trees) {
            const trees = state.trees as Record<string, any>;
            for (const key of Object.keys(trees)) {
              function walk(node: any) {
                if (node.title in titleMap) {
                  node.title = titleMap[node.title];
                }
                if (node.metadata?.description && node.metadata.description in descMap) {
                  node.metadata.description = descMap[node.metadata.description];
                }
                node.children?.forEach((c) => walk(c));
              }
              walk(trees[key]);
            }
          }
          if (state.projects) {
            const projects = state.projects as Project[];
            const projectTitleMap: Record<string, string> = {
              'Urban Serendipity': '都市奇缘',
              'Escape Room': '密室逃脱',
            };
            const projectDescMap: Record<string, string> = {
              'A short drama about urban white-collar romance': '一部关于都市白领爱情的短剧',
              'A suspense mystery short video series': '悬疑解谜短视频系列',
            };
            for (const p of projects) {
              if (p.title in projectTitleMap) p.title = projectTitleMap[p.title];
              if (p.description in projectDescMap) p.description = projectDescMap[p.description];
            }
          }
        }
        if (version < 5) {
          // Deduplicate projects by id (keep the most recently updated one).
          // This fixes a race in pullAll() where rapid pulls could create duplicate server projects locally.
          if (state.projects) {
            let projects = state.projects as Project[];
            const seen = new Map<string, Project>();
            for (const p of projects) {
              const existing = seen.get(p.id);
              if (!existing || (p.updatedAt && p.updatedAt > existing.updatedAt)) {
                seen.set(p.id, p);
              }
            }
            projects = Array.from(seen.values());

            // Some race duplicates kept the temporary generated id while copying the seed title.
            // For the canonical seed titles, keep the official seed id (proj_1 / proj_2) and drop look-alikes.
            const seedTitleToId: Record<string, string> = {
              '都市奇缘': 'proj_1',
              '密室逃脱': 'proj_2',
            };
            const byTitle = new Map<string, Project[]>();
            for (const p of projects) {
              const group = byTitle.get(p.title) ?? [];
              group.push(p);
              byTitle.set(p.title, group);
            }
            for (const [title, group] of byTitle) {
              const seedId = seedTitleToId[title];
              if (seedId && group.length > 1) {
                const keeper = group.find((p) => p.id === seedId) ?? group[group.length - 1];
                projects = projects.filter((p) => p.title !== title || p.id === keeper.id);
              }
            }
            state.projects = projects;
          }
        }
        return state as unknown as ProjectState;
      },
      partialize: (state) => ({
        projects: state.projects,
      }) as unknown as ProjectState,
    }
  )
);
