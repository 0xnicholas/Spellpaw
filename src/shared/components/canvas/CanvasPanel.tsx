import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type ReactFlowInstance,
  type EdgeChange,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '@drama/stores/canvasStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { computeDisplayNumbers } from '@drama/lib/numbering';
import type { CanvasNode, CanvasEdge } from '@drama/types';
import { ScriptCardNode, ArtCardNode, CharacterCardNode, DeliverableCardNode, SceneCardNode } from './nodes';
import { GenericCardNode } from './nodes/GenericCardNode';
import { CopilotCardNode } from './nodes/CopilotCardNode';
import { CardDetailDrawer } from './CardDetailDrawer';
import { PaneContextMenu, type CopilotKind } from './PaneContextMenu';
import { generateId } from '@/shared/lib/utils';

const nodeTypes: NodeTypes = {
  script: ScriptCardNode,
  art: ArtCardNode,
  character: CharacterCardNode,
  deliverable: DeliverableCardNode,
  sceneCard: SceneCardNode,
  storyline: GenericCardNode,
  moodboard: GenericCardNode,
  videoClip: GenericCardNode,
  asset: GenericCardNode,
  task: GenericCardNode,
  copilotCard: CopilotCardNode,
};

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
  data: Record<string, unknown>;
}

interface PaneMenuState {
  x: number;
  y: number;
  flowPosition: { x: number; y: number };
}

interface CanvasPanelProps {
  onAIAction?: (prompt: string) => void;
}

export function CanvasPanel({ onAIAction }: CanvasPanelProps = {}) {
  const getCurrentNodes = useCanvasStore((s) => s.getCurrentNodes);
  const getCurrentEdges = useCanvasStore((s) => s.getCurrentEdges);
  const syncNodes = useCanvasStore((s) => s.syncNodes);
  const syncEdges = useCanvasStore((s) => s.syncEdges);
  const addEdge = useCanvasStore((s) => s.addEdge);
  const duplicateNode = useCanvasStore((s) => s.duplicateNode);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const setSelectedCardId = useCanvasStore((s) => s.setSelectedCardId);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const [zoom, setZoom] = useState(1);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup click debounce timer on unmount
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  const persistedNodes = useCanvasStore((s) => s.getCurrentNodes());
  const persistedEdges = useCanvasStore((s) => s.getCurrentEdges());

  const currentTree = useProjectStore((s) => s.getCurrentTree());

  const [nodes, setNodes, onNodesChange] = useNodesState(persistedNodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(persistedEdges as Edge[]);

  // Sync React Flow state with external store changes (e.g. Copilot guardrail adding a card).
  useEffect(() => {
    setNodes(persistedNodes as Node[]);
  }, [persistedNodes, setNodes]);

  useEffect(() => {
    setEdges(persistedEdges as Edge[]);
  }, [persistedEdges, setEdges]);

  // Reset React Flow internal state when switching projects
  useEffect(() => {
    const freshNodes = getCurrentNodes();
    const freshEdges = getCurrentEdges();
    setNodes(freshNodes as Node[]);
    setEdges(freshEdges as Edge[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  const highlightCardIds = useCanvasStore((s) => s.highlightCardIds);
  const highlightSet = useMemo(() => new Set(highlightCardIds), [highlightCardIds]);
  const focusCardId = useCanvasStore((s) => s.focusCardId);

  // Auto-pan to focused card
  useEffect(() => {
    if (!focusCardId || !reactFlowRef.current) return;
    const node = nodes.find((n) => n.id === focusCardId);
    if (node) {
      reactFlowRef.current.setCenter(node.position.x + 120, node.position.y + 100, { zoom: 1, duration: 400 });
    }
    useCanvasStore.getState().clearFocusCard();
  }, [focusCardId, nodes]);

  const nodesWithDisplay = useMemo(() => {
    const map = computeDisplayNumbers(currentTree, getCurrentNodes());
    return nodes.map((n) => ({
      ...n,
      data: { ...n.data, _displayNumber: map.get(n.id) ?? '', _highlighted: highlightSet.has(n.id), _onAIAction: onAIAction },
    }));
  }, [nodes, currentTree, getCurrentNodes, highlightSet, onAIAction]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge = {
        id: generateId('edge_'),
        source: connection.source!,
        target: connection.target!,
        animated: true,
      };
      setEdges((eds) => [...eds, edge]);
      addEdge(edge as CanvasEdge);
    },
    [setEdges, addEdge]
  );

  const onNodeDragStop = useCallback(() => {
    syncNodes(nodes as CanvasNode[]);
  }, [nodes, syncNodes]);

  const onEdgesChangeWrapper = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      syncEdges(edges as CanvasEdge[]);
    },
    [onEdgesChange, edges, syncEdges]
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id, data: node.data });
    },
    []
  );

  const [paneMenu, setPaneMenu] = useState<PaneMenuState | null>(null);

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      const rf = reactFlowRef.current;
      if (!rf) return;  // guard: onInit hasn't fired yet
      const flowPos = rf.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setPaneMenu({ x: event.clientX, y: event.clientY, flowPosition: flowPos });
    },
    []
  );

  const closePaneMenu = useCallback(() => setPaneMenu(null), []);

  const handlePaneCreate = useCallback(
    (kind: CopilotKind, flowPos: { x: number; y: number }) => {
      const copilotNode: CanvasNode = {
        id: generateId('copilot_'),
        type: 'copilotCard',
        position: flowPos,
        // Cast data: copilotCard has its own status enum ('idle' | 'generating' | 'done' | 'error')
        // that is broader than CanvasNodeData['status']; cast the whole payload.
        data: { kind, status: 'idle' as never } as never,
      };
      useCanvasStore.getState().addNode(copilotNode);
      setPaneMenu(null);
    },
    []
  );

  const closeContextMenu = () => setContextMenu(null);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Skip if clicking interactive elements (thumbnails, inputs, buttons)
      const target = _event.target as HTMLElement;
      if (
        target.tagName === 'IMG' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'BUTTON' ||
        target.closest('button') ||
        target.closest('input')
      ) {
        return;
      }
      // Debounce to avoid drawer flash on double-click-to-edit
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = setTimeout(() => {
        setSelectedCardId(node.id);
      }, 250);
    },
    [setSelectedCardId]
  );

  const handleContextAction = (action: string) => {
    if (!contextMenu) return;
    switch (action) {
      case 'duplicate':
        duplicateNode(contextMenu.nodeId);
        break;
      case 'delete':
        removeNode(contextMenu.nodeId);
        break;
    }
    closeContextMenu();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 relative overflow-hidden">
        <ReactFlow
          nodes={nodesWithDisplay as Node[]}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={(instance: ReactFlowInstance) => {
            reactFlowRef.current = instance;
            setZoom(instance.getZoom());
          }}
          onMove={(_: unknown, viewport: { zoom: number }) => setZoom(viewport.zoom)}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChangeWrapper}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onNodeContextMenu={onNodeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          onNodeClick={onNodeClick}
          onPaneClick={() => {
            closeContextMenu();
            setSelectedCardId(null);
          }}
          className="bg-[var(--color-bg-secondary)]"
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="var(--color-border-subtle)" />
          <Controls className="!rounded-[var(--radius-base)] !border !border-[var(--color-border-default)] !shadow-sm" />
        </ReactFlow>

        {/* Card Detail Drawer */}
        <CardDetailDrawer />

        <div className="absolute bottom-2 left-2 z-10 rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)]/80 px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)] backdrop-blur-sm border border-[var(--color-border-default)]">
          {Math.round(zoom * 100)}%
        </div>

        {/* Pane Context Menu */}
        {paneMenu && (
          <PaneContextMenu
            x={paneMenu.x}
            y={paneMenu.y}
            flowPosition={paneMenu.flowPosition}
            onClose={closePaneMenu}
            onCreate={handlePaneCreate}
          />
        )}

        {/* Context Menu */}
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={closeContextMenu} />
            <div
              className="fixed z-50 min-w-[140px] rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] py-1 shadow-lg"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button onClick={() => handleContextAction('duplicate')} className="block w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--color-bg-secondary)]">
                复制
              </button>
              <button onClick={() => handleContextAction('delete')} className="block w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-[var(--color-bg-secondary)]">
                删除
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
