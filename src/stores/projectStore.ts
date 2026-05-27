import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { produce } from 'immer';
import type { TreeNode, Project } from '@/types';
import { mockProjects } from '@/data/mockProjects';
import { mockTreeData } from '@/data/mockTreeData';

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  treeData: TreeNode | null;
  selectedNodeId: string | null;

  setCurrentProject: (id: string) => void;
  updateTreeNode: (nodeId: string, updates: Partial<TreeNode>) => void;
  addTreeNode: (parentId: string, node: TreeNode) => void;
  deleteTreeNode: (nodeId: string) => void;
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
      currentProjectId: mockProjects[0]?.id ?? null,
      treeData: mockTreeData,
      selectedNodeId: null,

      setCurrentProject: (id) => set({ currentProjectId: id }),

      updateTreeNode: (nodeId, updates) =>
        set(
          produce((state) => {
            function walk(node: TreeNode) {
              if (node.id === nodeId) {
                Object.assign(node, updates);
                return true;
              }
              if (node.children) {
                for (const child of node.children) {
                  if (walk(child)) return true;
                }
              }
              return false;
            }
            if (state.treeData) walk(state.treeData);
          })
        ),

      addTreeNode: (parentId, node) =>
        set(
          produce((state) => {
            function walk(n: TreeNode) {
              if (n.id === parentId) {
                if (!n.children) n.children = [];
                n.children.push(node);
                return true;
              }
              if (n.children) {
                for (const child of n.children) {
                  if (walk(child)) return true;
                }
              }
              return false;
            }
            if (state.treeData) walk(state.treeData);
          })
        ),

      deleteTreeNode: (nodeId) =>
        set(
          produce((state) => {
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
            if (state.treeData && state.treeData.id !== nodeId) {
              walk(state.treeData);
            }
            if (state.selectedNodeId === nodeId) {
              state.selectedNodeId = null;
            }
          })
        ),

      toggleExpanded: (nodeId) =>
        set(
          produce((state) => {
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
            if (state.treeData) walk(state.treeData);
          })
        ),

      selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

      getSelectedNodePath: () => {
        const { treeData, selectedNodeId } = get();
        if (!treeData || !selectedNodeId) return [];
        return findNodePath(treeData, selectedNodeId) ?? [];
      },
    }),
    {
      name: 'spellpaw_project',
      partialize: (state) => ({
        projects: state.projects,
        currentProjectId: state.currentProjectId,
        treeData: state.treeData,
        selectedNodeId: state.selectedNodeId,
      }),
    }
  )
);
