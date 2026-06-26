import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useViewport,
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
import { CardDetailDrawer } from './CardDetailDrawer';
import { PaneContextMenu, type CopilotKind } from './PaneContextMenu';
import { NodeContextMenu, type NodeAction } from './NodeContextMenu';
import { CardCopilotPopover } from './CardCopilotPopover';
import {
  kindToCardType,
  defaultTitle,
  inferKindFromCard,
} from './helpers/kindInference';
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

interface CopilotPopoverState {
  nodeId: string;
  kind: CopilotKind;
  flowPosition: { x: number; y: number };
}

interface CanvasPanelProps {
  onAIAction?: (prompt: string) => void;
}

// Popover positioning constants
const CARD_WIDTH = 240;
const POPOVER_WIDTH = 560;
const POPOVER_GAP = 16;  // visual gap between card bottom and popover top (matches buzzy)
const NAVBAR_HEIGHT = 64;
const VIEWPORT_PAD = 16;

/**
 * Get the actual rendered card dimensions from the DOM.
 * Returns null if the card element isn't yet in the DOM (e.g. mid-render or in tests).
 *
 * We use the actual DOM measurement because the card height varies dramatically
 * by content: script cards are ~80px, while art/sceneCard with 9:16 thumbnails
 * are ~400-500px. A fixed estimate would misposition the popover.
 */
function getCardScreenRect(nodeId: string): { top: number; bottom: number; left: number; right: number; centerX: number } | null {
  // React Flow renders each node inside a wrapper with class `react-flow__node`
  // and a `data-id` attribute containing the node id.
  const wrapper = document.querySelector(`.react-flow__node[data-id="${CSS.escape(nodeId)}"]`);
  if (!wrapper) return null;
  // The actual card content is inside the wrapper as a child (e.g., the BuzzyCard div).
  // Use the wrapper's rect — it bounds the card including the React Flow node border.
  const rect = wrapper.getBoundingClientRect();
  return {
    top: rect.top,
    bottom: rect.bottom,
    left: rect.left,
    right: rect.right,
    centerX: rect.left + rect.width / 2,
  };
}

export function CanvasPanel({ onAIAction }: CanvasPanelProps = {}) {
  const getCurrentNodes = useCanvasStore((s) => s.getCurrentNodes);
  const getCurrentEdges = useCanvasStore((s) => s.getCurrentEdges);
  const syncNodes = useCanvasStore((s) => s.syncNodes);
  const syncEdges = useCanvasStore((s) => s.syncEdges);
  const addEdge = useCanvasStore((s) => s.addEdge);
  const duplicateNode = useCanvasStore((s) => s.duplicateNode);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const setSelectedCardId = useCanvasStore((s) => s.setSelectedCardId);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  // Zoom badge reads from useViewport (vpZoom declared below).

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [paneMenu, setPaneMenu] = useState<PaneMenuState | null>(null);
  const [copilotTarget, setCopilotTarget] = useState<CopilotPopoverState | null>(null);
  const [popoverScreenPos, setPopoverScreenPos] = useState<{ x: number; y: number } | null>(null);

  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingClickRef = useRef<{ nodeId: string; t: number } | null>(null);

  // React Flow viewport (pan/zoom) — used to recompute popover position
  const { x: vpX, y: vpY, zoom: vpZoom } = useViewport();

  // Cleanup click debounce timer on unmount
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  const persistedNodes = useCanvasStore((s) => s.getCurrentNodes());
  const persistedEdges = useCanvasStore((s) => s.getCurrentEdges());

  const canvasNodes = useCanvasStore((s) => s.getCurrentNodes());

  const [nodes, setNodes, onNodesChange] = useNodesState(persistedNodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(persistedEdges as Edge[]);

  // Sync React Flow state with external store changes
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
    const map = computeDisplayNumbers(canvasNodes, getCurrentNodes());
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

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      const rf = reactFlowRef.current;
      // In tests, reactFlowRef is null. Fall back to using clientX/Y directly as flow coords.
      const flowPos = rf
        ? rf.screenToFlowPosition({ x: event.clientX, y: event.clientY })
        : { x: event.clientX, y: event.clientY };
      setPaneMenu({ x: event.clientX, y: event.clientY, flowPosition: flowPos });
    },
    []
  );

  const closePaneMenu = useCallback(() => setPaneMenu(null), []);

  const handlePaneCreate = useCallback(
    (kind: CopilotKind, flowPos: { x: number; y: number }) => {
      // v2: 右键创建占位卡片 + 自动打开 copilot 弹窗
      const cardType = kindToCardType(kind);
      const newNode: CanvasNode = {
        id: generateId(cardType + '_'),
        type: cardType,
        position: flowPos,
        data: {
          title: defaultTitle(kind),
          isPlaceholder: true,
        },
      };
      useCanvasStore.getState().addNode(newNode);
      setCopilotTarget({ nodeId: newNode.id, kind, flowPosition: flowPos });
      setPaneMenu(null);
    },
    []
  );

  const closeContextMenu = () => setContextMenu(null);

  const handleContextAction = (action: NodeAction) => {
    if (!contextMenu) return;
    switch (action) {
      case 'duplicate':
        duplicateNode(contextMenu.nodeId);
        break;
      case 'delete':
        removeNode(contextMenu.nodeId);
        break;
      case 'rename': {
        const currentTitle = String(contextMenu.data.title ?? '');
        const next = window.prompt('Rename card', currentTitle);
        if (next !== null && next.trim() !== '' && next !== currentTitle) {
          updateNodeData(contextMenu.nodeId, { title: next.trim() });
        }
        break;
      }
      case 'copy-id':
        void navigator.clipboard.writeText(contextMenu.nodeId);
        break;
    }
    closeContextMenu();
  };

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Skip if clicking interactive elements
      const target = _event.target as HTMLElement;
      if (
        target.tagName === 'IMG' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'BUTTON' ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('textarea')
      ) {
        return;
      }

      const now = Date.now();
      // Double-click detection: same node within 250ms
      if (pendingClickRef.current?.nodeId === node.id && now - pendingClickRef.current.t < 250) {
        if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
        pendingClickRef.current = null;
        setCopilotTarget(null);
        setSelectedCardId(node.id);
        return;
      }

      pendingClickRef.current = { nodeId: node.id, t: now };
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = setTimeout(() => {
        // Self-click guard: skip if popover already open on same card
        if (copilotTarget?.nodeId === node.id) {
          pendingClickRef.current = null;
          return;
        }
        const kind = inferKindFromCard(node as unknown as CanvasNode);
        setCopilotTarget({ nodeId: node.id, kind, flowPosition: node.position });
        setSelectedCardId(null);
        pendingClickRef.current = null;
      }, 250);
    },
    [setSelectedCardId, copilotTarget]
  );

  // 防御：popover 目标卡片被外部删除时关闭
  const currentNodes = useCanvasStore((s) => s.getCurrentNodes());
  useEffect(() => {
    if (!copilotTarget) return;
    if (!currentNodes.some((n) => n.id === copilotTarget.nodeId)) {
      setCopilotTarget(null);
    }
  }, [currentNodes, copilotTarget]);

  // Recompute popover screen position (viewport change + target change)
  useEffect(() => {
    if (!copilotTarget) {
      setPopoverScreenPos(null);
      return;
    }

    // Prefer the actual rendered card position from the DOM — card height varies
    // dramatically by content (script: ~80px, art with 9:16 thumb: ~480px) so a
    // fixed flow-coordinate estimate is unreliable. Fall back to flow coords if
    // the DOM element isn't yet rendered (e.g. immediately after card creation).
    const cardRect = getCardScreenRect(copilotTarget.nodeId);

    let popoverCenterX: number;
    let popoverTop: number;

    if (cardRect) {
      popoverCenterX = cardRect.centerX;
      popoverTop = cardRect.bottom + POPOVER_GAP;
    } else {
      const rf = reactFlowRef.current;
      popoverCenterX = rf
        ? rf.flowToScreenPosition({
            x: copilotTarget.flowPosition.x + CARD_WIDTH / 2,
            y: copilotTarget.flowPosition.y,
          }).x
        : copilotTarget.flowPosition.x + CARD_WIDTH / 2;
      popoverTop = rf
        ? rf.flowToScreenPosition({
            x: copilotTarget.flowPosition.x + CARD_WIDTH / 2,
            y: copilotTarget.flowPosition.y,
          }).y
        : copilotTarget.flowPosition.y;
    }

    setPopoverScreenPos({
      x: Math.max(
        POPOVER_WIDTH / 2 + VIEWPORT_PAD,
        Math.min(popoverCenterX, window.innerWidth - POPOVER_WIDTH / 2 - VIEWPORT_PAD),
      ),
      y: Math.max(NAVBAR_HEIGHT, popoverTop),
    });
  }, [copilotTarget, vpX, vpY, vpZoom]);

  // Recompute on window resize
  useEffect(() => {
    if (!copilotTarget) return;
    const onResize = () => {
      const cardRect = getCardScreenRect(copilotTarget.nodeId);
      let popoverCenterX: number;
      let popoverTop: number;
      if (cardRect) {
        popoverCenterX = cardRect.centerX;
        popoverTop = cardRect.bottom + POPOVER_GAP;
      } else {
        const rf = reactFlowRef.current;
        popoverCenterX = rf
          ? rf.flowToScreenPosition({
              x: copilotTarget.flowPosition.x + CARD_WIDTH / 2,
              y: copilotTarget.flowPosition.y,
            }).x
          : copilotTarget.flowPosition.x + CARD_WIDTH / 2;
        popoverTop = rf
          ? rf.flowToScreenPosition({
              x: copilotTarget.flowPosition.x + CARD_WIDTH / 2,
              y: copilotTarget.flowPosition.y,
            }).y
          : copilotTarget.flowPosition.y;
      }
      setPopoverScreenPos({
        x: Math.max(
          POPOVER_WIDTH / 2 + VIEWPORT_PAD,
          Math.min(popoverCenterX, window.innerWidth - POPOVER_WIDTH / 2 - VIEWPORT_PAD),
        ),
        y: Math.max(NAVBAR_HEIGHT, popoverTop),
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [copilotTarget]);

  // Drag tracking: update copilotTarget.flowPosition on drag so popover follows
  const onNodeDrag = useCallback(
    (_event: React.MouseEvent | TouchEvent | MouseEvent, node: Node) => {
      if (copilotTarget?.nodeId === node.id) {
        setCopilotTarget({ ...copilotTarget, flowPosition: node.position });
      }
    },
    [copilotTarget]
  );

  return (
    // ReactFlowProvider 必须在 CanvasPanel 外面提供（见 WorkspacePage.tsx）。
    // 这里不能再包一层——hooks 在函数体顶部执行，JSX 包装对它们不可见。
    <div className="flex h-full flex-col">
      <div className="flex-1 relative overflow-hidden">
        <ReactFlow
          nodes={nodesWithDisplay as Node[]}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={(instance: ReactFlowInstance) => {
            reactFlowRef.current = instance;
          }}
          onMove={() => {}}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChangeWrapper}
          onConnect={onConnect}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onNodeContextMenu={onNodeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          onNodeClick={onNodeClick}
          onPaneClick={() => {
            closeContextMenu();
            setSelectedCardId(null);
            setCopilotTarget(null);
          }}
          selectionOnDrag
          panOnDrag={[1, 2]}
          multiSelectionKeyCode={['Shift', 'Meta']}
          className="bg-black"
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={2} color="rgba(255, 255, 255, 0.12)" />
          <Controls className="!rounded-[var(--radius-base)] !border !border-[var(--color-border-default)] !shadow-sm" />
          <MiniMap
            pannable
            zoomable
            maskColor="rgba(0, 0, 0, 0.4)"
            nodeColor={(node) => {
              const typeColors: Record<string, string> = {
                storyline: '#a78bfa',
                moodboard: '#f472b6',
                videoClip: '#60a5fa',
                asset: '#fbbf24',
                task: '#94a3b8',
                art: '#34d399',
                character: '#fb7185',
                script: '#818cf8',
                sceneCard: '#22d3ee',
                deliverable: '#facc15',
              };
              return typeColors[node.type ?? ''] ?? '#94a3b8';
            }}
            className="!bg-[var(--color-bg-primary)] !border !border-[var(--color-border-default)] !rounded-[var(--radius-base)]"
          />
        </ReactFlow>

        {/* Card Detail Drawer */}
        <CardDetailDrawer />

        <div className="absolute bottom-2 left-2 z-10 rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)]/80 px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)] backdrop-blur-sm border border-[var(--color-border-default)]">
          {Math.round(vpZoom * 100)}%
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

        {/* Node Context Menu */}
        {contextMenu && (
          <NodeContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            nodeId={contextMenu.nodeId}
            onAction={handleContextAction}
            onClose={closeContextMenu}
          />
        )}

        {/* Copilot Popover (Portal) */}
        {copilotTarget && popoverScreenPos && (
          <CardCopilotPopover
            key={copilotTarget.nodeId}
            cardId={copilotTarget.nodeId}
            kind={copilotTarget.kind}
            screenPosition={popoverScreenPos}
            onClose={() => setCopilotTarget(null)}
          />
        )}
      </div>
    </div>
  );
}