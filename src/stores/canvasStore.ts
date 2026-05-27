import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CanvasNode, CanvasEdge, AssetItem, TreeNode } from '@/types';
import { mockCanvasNodes, mockCanvasEdges } from '@/data/mockCanvasData';
import { generateId } from '@/lib/utils';

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface CanvasState {
  persistedNodes: CanvasNode[];
  persistedEdges: CanvasEdge[];
  viewport: Viewport;

  syncNodes: (nodes: CanvasNode[]) => void;
  syncEdges: (edges: CanvasEdge[]) => void;
  syncViewport: (viewport: Viewport) => void;

  addNode: (node: CanvasNode) => void;
  addNodeFromAsset: (asset: AssetItem, position: { x: number; y: number }) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<CanvasNodeData>) => void;
  addEdge: (edge: CanvasEdge) => void;
  removeEdge: (id: string) => void;
  syncFromTreeNode: (node: TreeNode) => void;
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      persistedNodes: mockCanvasNodes,
      persistedEdges: mockCanvasEdges,
      viewport: { x: 0, y: 0, zoom: 1 },

      syncNodes: (nodes) => set({ persistedNodes: nodes }),
      syncEdges: (edges) => set({ persistedEdges: edges }),
      syncViewport: (viewport) => set({ viewport }),

      addNode: (node) =>
        set((state) => ({ persistedNodes: [...state.persistedNodes, node] })),

      addNodeFromAsset: (asset, position) => {
        const node: CanvasNode = {
          id: generateId('canvas_asset_'),
          type: 'assetCard',
          position,
          data: {
            title: asset.name,
            description: asset.type,
            thumbnail: asset.thumbnail,
          },
        };
        get().addNode(node);
      },

      removeNode: (id) =>
        set((state) => ({
          persistedNodes: state.persistedNodes.filter((n) => n.id !== id),
          persistedEdges: state.persistedEdges.filter(
            (e) => e.source !== id && e.target !== id
          ),
        })),

      duplicateNode: (id) => {
        const node = get().persistedNodes.find((n) => n.id === id);
        if (!node) return;
        const newNode: CanvasNode = {
          ...node,
          id: generateId('canvas_'),
          position: { x: node.position.x + 40, y: node.position.y + 40 },
          data: { ...node.data, linkedTreeNodeId: undefined },
        };
        get().addNode(newNode);
      },

      updateNodeData: (id, data) =>
        set((state) => ({
          persistedNodes: state.persistedNodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...data } } : n
          ),
        })),

      addEdge: (edge) =>
        set((state) => ({ persistedEdges: [...state.persistedEdges, edge] })),

      removeEdge: (id) =>
        set((state) => ({
          persistedEdges: state.persistedEdges.filter((e) => e.id !== id),
        })),

      syncFromTreeNode: (node) => {
        const existing = get().persistedNodes.find((n) => n.id === `canvas_${node.id}`);
        if (existing) {
          get().syncNodes(
            get().persistedNodes.map((n) =>
              n.id === existing.id
                ? { ...n, data: { ...n.data, title: node.title, status: node.status } }
                : n
            )
          );
        } else {
          const newNode: CanvasNode = {
            id: `canvas_${node.id}`,
            type: 'sceneCard',
            position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
            data: {
              title: node.title,
              description: node.metadata?.description ?? '',
              status: node.status,
            },
          };
          get().addNode(newNode);
        }
      },
    }),
    {
      name: 'spellpaw_canvas',
      partialize: (state) => ({
        persistedNodes: state.persistedNodes,
        persistedEdges: state.persistedEdges,
        viewport: state.viewport,
      }),
    }
  )
);
