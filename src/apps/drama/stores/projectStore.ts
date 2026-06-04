import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { produce } from 'immer';
import type { TreeNode, Project } from '@drama/types';
import { mockProjects } from '@drama/data/mockProjects';
import { mockTreeData } from '@drama/data/mockTreeData';
import { generateId } from '@/shared/lib/utils';
import { createIDBStorage } from '@/shared/lib/idbStorage';

interface ProjectState {
  projects: Project[];
  trees: Record<string, TreeNode>;
  currentProjectId: string | null;
  selectedNodeId: string | null;

  getCurrentTree: () => TreeNode | null;
  setCurrentProject: (id: string) => void;
  createProject: (title: string, description: string, coverColor: string) => string;
  deleteProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  updateTreeNode: (nodeId: string, updates: Partial<TreeNode>) => void;
  addTreeNode: (parentId: string, node: TreeNode) => void;
  deleteTreeNode: (nodeId: string) => void;
  moveTreeNode: (nodeId: string, newIndex: number) => void;
  toggleExpanded: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  getSelectedNodePath: () => string[];
  setLockedStyle: (prompt: string, nodeId: string) => void;
  clearLockedStyle: () => void;
  getLockedStyle: () => { prompt: string | null; nodeId: string | null };
}

function findNodePath(node: TreeNode | null, targetId: string, path: string[] = []): string[] | null {
  if (!node) return null;
  if (node.id === targetId) return [...path, node.title];
  if (node.children) {
    for (const child of node.children) {
      const result = findNodePath(child, targetId, [...path, node.title]);
      if (result) return result;
    }
  }
  return null;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: mockProjects,
      trees: { 'proj_1': mockTreeData },
      currentProjectId: mockProjects[0]?.id ?? null,
      selectedNodeId: null,

      getCurrentTree: () => {
        const { trees, currentProjectId } = get();
        return (currentProjectId && trees[currentProjectId]) ? trees[currentProjectId] : null;
      },

      setCurrentProject: (id) =>
        set((state) => {
          if (state.trees[id]) {
            return { currentProjectId: id, selectedNodeId: null };
          }
          // Auto-create empty tree for projects that lack one
          const project = state.projects.find((p) => p.id === id);
          const now = new Date().toISOString();
          const treeRoot: TreeNode = {
            id: generateId('tree_root_'),
            type: 'project',
            title: project?.title ?? 'Untitled',
            status: 'draft',
            expanded: true,
            metadata: {
              description: project?.description ?? '',
              duration: 0,
              createdAt: now,
              updatedAt: now,
            },
          };
          return {
            currentProjectId: id,
            selectedNodeId: null,
            trees: { ...state.trees, [id]: treeRoot },
          };
        }),

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
        const treeRoot: TreeNode = {
          id: generateId('tree_root_'),
          type: 'project',
          title: title,
          status: 'draft',
          expanded: true,
          metadata: {
            description,
            duration: 0,
            createdAt: now,
            updatedAt: now,
          },
          children: [],
        };
        set((state) => ({
          projects: [...state.projects, project],
          trees: { ...state.trees, [id]: treeRoot },
          currentProjectId: id,
          selectedNodeId: null,
        }));
        return id;
      },

      deleteProject: (id) =>
        set((state) => {
          const { [id]: _removed, ...restTrees } = state.trees;
          const newProjects = state.projects.filter((p) => p.id !== id);
          const newCurrentId = state.currentProjectId === id
            ? (newProjects[0]?.id ?? null)
            : state.currentProjectId;
          return {
            projects: newProjects,
            trees: restTrees,
            currentProjectId: newCurrentId,
            selectedNodeId: null,
          };
        }),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        })),

      updateTreeNode: (nodeId, updates) =>
        set(
          produce((state: ProjectState) => {
            const tree = state.trees[state.currentProjectId!];
            if (!tree) return;
            function walk(node: TreeNode) {
              if (node.id === nodeId) {
                if (updates.metadata && node.metadata) {
                  Object.assign(node.metadata, updates.metadata);
                }
                Object.assign(node, { ...updates, metadata: node.metadata });
                if (node.metadata) node.metadata.updatedAt = new Date().toISOString();
                return true;
              }
              if (node.children) {
                for (const child of node.children) {
                  if (walk(child)) return true;
                }
              }
              return false;
            }
            walk(tree);
          })
        ),

      addTreeNode: (parentId, node) =>
        set(
          produce((state: ProjectState) => {
            const tree = state.trees[state.currentProjectId!];
            if (!tree) return;
            const now = new Date().toISOString();
            const newNode = {
              ...node,
              metadata: {
                duration: 0,
                createdAt: now,
                updatedAt: now,
                ...node.metadata,
              },
            };
            function walk(n: TreeNode) {
              if (n.id === parentId) {
                if (!n.children) n.children = [];
                n.children.push(newNode);
                n.expanded = true;
                return true;
              }
              if (n.children) {
                for (const child of n.children) {
                  if (walk(child)) return true;
                }
              }
              return false;
            }
            walk(tree);
          })
        ),

      deleteTreeNode: (nodeId) =>
        set(
          produce((state: ProjectState) => {
            const tree = state.trees[state.currentProjectId!];
            if (!tree) return;
            function walk(n: TreeNode): boolean {
              if (!n.children) return false;
              const idx = n.children.findIndex((c) => c.id === nodeId);
              if (idx !== -1) {
                n.children.splice(idx, 1);
                return true;
              }
              for (const child of n.children) {
                if (walk(child)) return true;
              }
              return false;
            }
            if (tree.id !== nodeId) walk(tree);
            if (state.selectedNodeId === nodeId) {
              state.selectedNodeId = null;
            }
          })
        ),

      moveTreeNode: (nodeId, newIndex) =>
        set(
          produce((state: ProjectState) => {
            const tree = state.trees[state.currentProjectId!];
            if (!tree) return;
            function walk(n: TreeNode): boolean {
              if (!n.children) return false;
              const idx = n.children.findIndex((c) => c.id === nodeId);
              if (idx !== -1) {
                const [node] = n.children.splice(idx, 1);
                n.children.splice(newIndex, 0, node);
                return true;
              }
              for (const child of n.children) {
                if (walk(child)) return true;
              }
              return false;
            }
            walk(tree);
          })
        ),

      toggleExpanded: (nodeId) =>
        set(
          produce((state: ProjectState) => {
            const tree = state.trees[state.currentProjectId!];
            if (!tree) return;
            function walk(node: TreeNode) {
              if (node.id === nodeId) {
                node.expanded = !node.expanded;
                return true;
              }
              if (node.children) {
                for (const child of node.children) {
                  if (walk(child)) return true;
                }
              }
              return false;
            }
            walk(tree);
          })
        ),

      selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

      updateNodes: (nodeIds: string[], updates: Partial<TreeNode>) =>
        set(
          produce((state: ProjectState) => {
            const idSet = new Set(nodeIds);
            for (const projectId of Object.keys(state.trees)) {
              function walk(node: TreeNode): boolean {
                if (idSet.has(node.id)) {
                  if (updates.metadata && node.metadata) {
                    Object.assign(node.metadata, updates.metadata);
                  }
                  Object.assign(node, { ...updates, metadata: node.metadata });
                  if (node.metadata) node.metadata.updatedAt = new Date().toISOString();
                }
                if (node.children) {
                  for (const child of node.children) {
                    walk(child);
                  }
                }
                return false;
              }
              walk(state.trees[projectId]);
            }
          })
        ),

      deleteNodes: (nodeIds: string[]) =>
        set(
          produce((state: ProjectState) => {
            const idSet = new Set(nodeIds);
            for (const projectId of Object.keys(state.trees)) {
              function walk(n: TreeNode): boolean {
                if (!n.children) return false;
                const idx = n.children.findIndex((c) => idSet.has(c.id));
                if (idx !== -1) {
                  n.children.splice(idx, 1);
                  return true;
                }
                for (const child of n.children) {
                  if (walk(child)) return true;
                }
                return false;
              }
              // 可能需要多次调用以删除多个同级节点
              let found = true;
              while (found) {
                found = walk(state.trees[projectId]);
              }
            }
            if (state.selectedNodeId && idSet.has(state.selectedNodeId)) {
              state.selectedNodeId = null;
            }
          })
        ),

      getSelectedNodePath: () => {
        const { trees, currentProjectId, selectedNodeId } = get();
        const tree = currentProjectId ? trees[currentProjectId] : null;
        if (!tree || !selectedNodeId) return [];
        return findNodePath(tree, selectedNodeId) ?? [];
      },

      setLockedStyle: (prompt, nodeId) =>
        set(
          produce((state: ProjectState) => {
            const tree = state.trees[state.currentProjectId!];
            if (!tree) return;
            if (!tree.metadata) tree.metadata = { createdAt: '', updatedAt: '' };
            tree.metadata.lockedStylePrompt = prompt;
            tree.metadata.lockedStyleNodeId = nodeId;
            tree.metadata.updatedAt = new Date().toISOString();
          })
        ),

      clearLockedStyle: () =>
        set(
          produce((state: ProjectState) => {
            const tree = state.trees[state.currentProjectId!];
            if (!tree || !tree.metadata) return;
            tree.metadata.lockedStylePrompt = null;
            tree.metadata.lockedStyleNodeId = null;
            tree.metadata.updatedAt = new Date().toISOString();
          })
        ),

      getLockedStyle: () => {
        const tree = get().getCurrentTree();
        if (!tree?.metadata) return { prompt: null, nodeId: null };
        return {
          prompt: tree.metadata.lockedStylePrompt ?? null,
          nodeId: tree.metadata.lockedStyleNodeId ?? null,
        };
      },
    }),
    {
      name: 'spellpaw_project',
      version: 3,
      storage: createIDBStorage<ProjectState>('projectStore'),
      migrate: (persistedState: unknown, version) => {
        const state = persistedState as Record<string, unknown>;
        if (version < 2) {
          function fillMeta(node: TreeNode) {
            if (!node.metadata) {
              node.metadata = { createdAt: '', updatedAt: '' };
            }
            node.metadata.duration ??= 0;
            node.metadata.createdAt ??= new Date().toISOString();
            node.metadata.updatedAt ??= new Date().toISOString();
            node.children?.forEach((c: TreeNode) => fillMeta(c));
          }
          // Handle old format: treeData at top level
          if (state.treeData && !state.trees) {
            const tree = state.treeData as TreeNode;
            fillMeta(tree);
            state.trees = { [state.currentProjectId as string ?? 'default']: tree };
            delete state.treeData;
          }
          // Also handle if trees already exists (new format)
          if (state.trees) {
            const trees = state.trees as Record<string, TreeNode>;
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
            const trees = state.trees as Record<string, TreeNode>;
            for (const key of Object.keys(trees)) {
              function walk(node: TreeNode) {
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
        return state as unknown as ProjectState;
      },
      partialize: (state) => ({
        projects: state.projects,
        trees: state.trees,
        currentProjectId: state.currentProjectId,
        selectedNodeId: state.selectedNodeId,
      }) as unknown as ProjectState,
    }
  )
);
