import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CanvasNode, CanvasEdge } from '@drama/types';
import { generateId } from '@/shared/lib/utils';
import { createIDBStorage } from '@/shared/lib/idbStorage';
import { useProjectStore } from './projectStore';

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// Stable empty references to prevent Zustand infinite loops
const EMPTY_NODES: CanvasNode[] = [];
const EMPTY_EDGES: CanvasEdge[] = [];
const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

interface CanvasEntry {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: Viewport;
}

interface CanvasState {
  canvases: Record<string, CanvasEntry>;

  getCurrentNodes: () => CanvasNode[];
  getCurrentEdges: () => CanvasEdge[];
  getCurrentViewport: () => Viewport;

  syncNodes: (nodes: CanvasNode[]) => void;
  syncEdges: (edges: CanvasEdge[]) => void;
  syncViewport: (viewport: Viewport) => void;

  addNode: (node: CanvasNode) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<CanvasNode['data']>) => void;
  addEdge: (edge: CanvasEdge) => void;
  removeEdge: (id: string) => void;

  selectedCardId: string | null;
  setSelectedCardId: (id: string | null) => void;
  getSelectedCard: () => CanvasNode | null;

  clearCurrentProjectCanvas: () => void;

  highlightCardIds: string[];
  triggerHighlight: (cardIds: string[]) => void;
  clearHighlights: () => void;

  focusCardId: string | null;
  triggerFocusCard: (cardId: string) => void;
  clearFocusCard: () => void;

  addChildToCard: (cardId: string, child: import('@drama/types').CardChild) => void;
  removeChildFromCard: (cardId: string, childId: string) => void;
  addCardRelation: (cardId: string, targetCardId: string) => void;
  removeCardRelation: (cardId: string, targetCardId: string) => void;
}

function ensureEntry(state: CanvasState): CanvasEntry {
  const projectId = useProjectStore.getState().currentProjectId;
  if (!projectId) return { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
  if (!state.canvases[projectId]) {
    state.canvases[projectId] = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
  }
  return state.canvases[projectId];
}

function bumpProjectUpdatedAt(): void {
  const projectId = useProjectStore.getState().currentProjectId;
  if (!projectId) return;
  useProjectStore.getState().updateProject(projectId, { updatedAt: new Date().toISOString() });
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      canvases: {},

      selectedCardId: null,
      highlightCardIds: [],
      focusCardId: null,

      getCurrentNodes: () => {
        const projectId = useProjectStore.getState().currentProjectId;
        return projectId ? get().canvases[projectId]?.nodes ?? EMPTY_NODES : EMPTY_NODES;
      },

      getCurrentEdges: () => {
        const projectId = useProjectStore.getState().currentProjectId;
        return projectId ? get().canvases[projectId]?.edges ?? EMPTY_EDGES : EMPTY_EDGES;
      },

      getCurrentViewport: () => {
        const projectId = useProjectStore.getState().currentProjectId;
        return projectId
          ? get().canvases[projectId]?.viewport ?? DEFAULT_VIEWPORT
          : DEFAULT_VIEWPORT;
      },

      syncNodes: (nodes) =>
        set((state) => {
          const projectId = useProjectStore.getState().currentProjectId;
          if (!projectId) return state;
          return {
            canvases: {
              ...state.canvases,
              [projectId]: { ...ensureEntry(state), nodes },
            },
          };
        }),

      syncEdges: (edges) =>
        set((state) => {
          const projectId = useProjectStore.getState().currentProjectId;
          if (!projectId) return state;
          return {
            canvases: {
              ...state.canvases,
              [projectId]: { ...ensureEntry(state), edges },
            },
          };
        }),

      syncViewport: (viewport) =>
        set((state) => {
          const projectId = useProjectStore.getState().currentProjectId;
          if (!projectId) return state;
          return {
            canvases: {
              ...state.canvases,
              [projectId]: { ...ensureEntry(state), viewport },
            },
          };
        }),

      addNode: (node) =>
        set((state) => {
          bumpProjectUpdatedAt();
          const projectId = useProjectStore.getState().currentProjectId;
          if (!projectId) return state;
          const entry = state.canvases[projectId]
            ? { ...state.canvases[projectId] }
            : { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
          return {
            canvases: {
              ...state.canvases,
              [projectId]: { ...entry, nodes: [...entry.nodes, node] },
            },
          };
        }),

      removeNode: (id) =>
        set((state) => {
          bumpProjectUpdatedAt();
          const projectId = useProjectStore.getState().currentProjectId;
          if (!projectId) return state;
          const entry = state.canvases[projectId];
          if (!entry) return state;
          return {
            canvases: {
              ...state.canvases,
              [projectId]: {
                ...entry,
                nodes: entry.nodes.filter((n) => n.id !== id),
                edges: entry.edges.filter((e) => e.source !== id && e.target !== id),
              },
            },
            ...(state.selectedCardId === id ? { selectedCardId: null } : {}),
          };
        }),

      duplicateNode: (id) => {
        const nodes = get().getCurrentNodes();
        const node = nodes.find((n) => n.id === id);
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
        set((state) => {
          bumpProjectUpdatedAt();
          const projectId = useProjectStore.getState().currentProjectId;
          if (!projectId) return state;
          const entry = state.canvases[projectId];
          if (!entry) return state;

          const existingNode = entry.nodes.find((n) => n.id === id);
          if (!existingNode) return state;
          const newNodeData = { ...existingNode.data, ...data };

          return {
            canvases: {
              ...state.canvases,
              [projectId]: {
                ...entry,
                nodes: entry.nodes.map((n) =>
                  n.id === id ? { ...n, data: newNodeData } : n
                ),
              },
            },
          } as CanvasState;
        }),

      addEdge: (edge) =>
        set((state) => {
          bumpProjectUpdatedAt();
          const projectId = useProjectStore.getState().currentProjectId;
          if (!projectId) return state;
          const entry = ensureEntry(state);
          return {
            canvases: {
              ...state.canvases,
              [projectId]: { ...entry, edges: [...entry.edges, edge] },
            },
          };
        }),

      removeEdge: (id) =>
        set((state) => {
          bumpProjectUpdatedAt();
          const projectId = useProjectStore.getState().currentProjectId;
          if (!projectId) return state;
          const entry = state.canvases[projectId];
          if (!entry) return state;
          return {
            canvases: {
              ...state.canvases,
              [projectId]: { ...entry, edges: entry.edges.filter((e) => e.id !== id) },
            },
          };
        }),

      setSelectedCardId: (id) => set({ selectedCardId: id }),

      getSelectedCard: () => {
        const nodes = get().getCurrentNodes();
        const id = get().selectedCardId;
        if (!id) return null;
        return nodes.find((n) => n.id === id) ?? null;
      },

      clearCurrentProjectCanvas: () =>
        set((state) => {
          const projectId = useProjectStore.getState().currentProjectId;
          if (!projectId) return state;
          const { [projectId]: _, ...rest } = state.canvases;
          return { canvases: rest, selectedCardId: null };
        }),

      triggerHighlight: (cardIds) => {
        set({ highlightCardIds: cardIds });
        setTimeout(() => set({ highlightCardIds: [] }), 2000);
      },

      clearHighlights: () => set({ highlightCardIds: [] }),

      triggerFocusCard: (cardId) => {
        set({ focusCardId: cardId });
        setTimeout(() => set({ focusCardId: null }), 3000);
      },

      clearFocusCard: () => set({ focusCardId: null }),

      addChildToCard: (cardId, child) =>
        set((state) => {
          bumpProjectUpdatedAt();
          const pid = useProjectStore.getState().currentProjectId;
          if (!pid) return state;
          const entry = state.canvases[pid];
          if (!entry) return state;
          return {
            canvases: {
              ...state.canvases,
              [pid]: {
                ...entry,
                nodes: entry.nodes.map((n) =>
                  n.id === cardId
                    ? { ...n, data: { ...n.data, children: [...(n.data.children ?? []), child] } }
                    : n
                ),
              },
            },
          };
        }),

      removeChildFromCard: (cardId, childId) =>
        set((state) => {
          bumpProjectUpdatedAt();
          const pid = useProjectStore.getState().currentProjectId;
          if (!pid) return state;
          const entry = state.canvases[pid];
          if (!entry) return state;
          return {
            canvases: {
              ...state.canvases,
              [pid]: {
                ...entry,
                nodes: entry.nodes.map((n) =>
                  n.id === cardId && n.data.children
                    ? { ...n, data: { ...n.data, children: n.data.children.filter((c) => c.id !== childId) } }
                    : n
                ),
              },
            },
          };
        }),

      addCardRelation: (cardId, targetCardId) =>
        set((state) => {
          bumpProjectUpdatedAt();
          const pid = useProjectStore.getState().currentProjectId;
          if (!pid) return state;
          const entry = state.canvases[pid];
          if (!entry) return state;
          return {
            canvases: {
              ...state.canvases,
              [pid]: {
                ...entry,
                nodes: entry.nodes.map((n) =>
                  n.id === cardId
                    ? { ...n, data: { ...n.data, linkedCardIds: [...(n.data.linkedCardIds ?? []), targetCardId] } }
                    : n
                ),
              },
            },
          };
        }),

      removeCardRelation: (cardId, targetCardId) =>
        set((state) => {
          bumpProjectUpdatedAt();
          const pid = useProjectStore.getState().currentProjectId;
          if (!pid) return state;
          const entry = state.canvases[pid];
          if (!entry) return state;
          return {
            canvases: {
              ...state.canvases,
              [pid]: {
                ...entry,
                nodes: entry.nodes.map((n) =>
                  n.id === cardId && n.data.linkedCardIds
                    ? { ...n, data: { ...n.data, linkedCardIds: n.data.linkedCardIds.filter((id) => id !== targetCardId) } }
                    : n
                ),
              },
            },
          };
        }),
    }),
    {
      name: 'spellpaw_canvas',
      version: 3,
      storage: createIDBStorage<CanvasState>('canvasStore'),
      migrate: (persistedState: unknown, version) => {
        const state = persistedState as Record<string, unknown>;
        // Handle old format: persistedNodes/persistedEdges/viewport at top level
        if (state.persistedNodes || state.persistedEdges || state.viewport) {
          const entry: CanvasEntry = {
            nodes: (state.persistedNodes as CanvasNode[]) ?? [],
            edges: (state.persistedEdges as CanvasEdge[]) ?? [],
            viewport: (state.viewport as Viewport) ?? { x: 0, y: 0, zoom: 1 },
          };
          state.canvases = { 'proj_1': entry };
          delete state.persistedNodes;
          delete state.persistedEdges;
          delete state.viewport;
        }
        if (version < 3) {
          const titleMap: Record<string, string> = {
            'Scene 1-1': '场景 1-1',
            'Cafe Encounter': '咖啡厅邂逅',
            'Scene 1-2': '场景 1-2',
            'Street Encounter': '街头重逢',
            'Note': '备注',
            'Act 1 must be completed within 90 seconds': '第一幕需在90秒内完成',
          };
          const descMap: Record<string, string> = {
            'Cafe Encounter': '咖啡厅邂逅',
            'Street Encounter': '街头重逢',
            'Act 1 must be completed within 90 seconds': '第一幕需在90秒内完成',
          };
          if (state.canvases) {
            const canvases = state.canvases as Record<string, CanvasEntry>;
            for (const key of Object.keys(canvases)) {
              for (const node of canvases[key].nodes) {
                if (node.data.title in titleMap) {
                  node.data.title = titleMap[node.data.title];
                }
                if (node.data.description && node.data.description in descMap) {
                  node.data.description = descMap[node.data.description];
                }
              }
            }
          }
        }
        return state as unknown as CanvasState;
      },
      partialize: (state) => ({
        canvases: state.canvases,
        // highlightCardIds, focusCardId are transient — not persisted
      }) as unknown as CanvasState,
    }
  )
);
