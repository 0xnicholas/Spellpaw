import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { produce } from 'immer';
import type { TreeNode, Project } from '@/types';
import { mockProjects } from '@/data/mockProjects';
import { mockTreeData } from '@/data/mockTreeData';
import { generateId } from '@/lib/utils';

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

      setCurrentProject: (id) => set({ currentProjectId: id, selectedNodeId: null }),

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

      getSelectedNodePath: () => {
        const { trees, currentProjectId, selectedNodeId } = get();
        const tree = currentProjectId ? trees[currentProjectId] : null;
        if (!tree || !selectedNodeId) return [];
        return findNodePath(tree, selectedNodeId) ?? [];
      },
    }),
    {
      name: 'spellpaw_project',
      version: 2,
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
        return state as unknown as ProjectState;
      },
      partialize: (state) => ({
        projects: state.projects,
        trees: state.trees,
        currentProjectId: state.currentProjectId,
        selectedNodeId: state.selectedNodeId,
      }),
    }
  )
);
