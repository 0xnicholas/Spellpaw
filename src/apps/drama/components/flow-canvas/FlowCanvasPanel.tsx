import { useCallback, useMemo, useState, useRef } from 'react';
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
import { ScriptCardNode, ArtCardNode, CharacterCardNode, DeliverableCardNode } from './nodes';
import { generateId } from '@/shared/lib/utils';

const nodeTypes: NodeTypes = {
  script: ScriptCardNode,
  art: ArtCardNode,
  character: CharacterCardNode,
  deliverable: DeliverableCardNode,
};

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
  data: Record<string, unknown>;
}

export function FlowCanvasPanel() {
  const getCurrentNodes = useCanvasStore((s) => s.getCurrentNodes);
  const getCurrentEdges = useCanvasStore((s) => s.getCurrentEdges);
  const syncNodes = useCanvasStore((s) => s.syncNodes);
  const syncEdges = useCanvasStore((s) => s.syncEdges);
  const addEdge = useCanvasStore((s) => s.addEdge);
  const duplicateNode = useCanvasStore((s) => s.duplicateNode);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const [zoom, setZoom] = useState(1);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const persistedNodes = getCurrentNodes();
  const persistedEdges = getCurrentEdges();

  const currentTree = useProjectStore((s) => s.getCurrentTree());

  const [nodes, , onNodesChange] = useNodesState(persistedNodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(persistedEdges as Edge[]);

  const nodesWithDisplay = useMemo(() => {
    const map = computeDisplayNumbers(currentTree, getCurrentNodes());
    return nodes.map((n) => ({
      ...n,
      data: { ...n.data, _displayNumber: map.get(n.id) ?? '' },
    }));
  }, [nodes, currentTree, getCurrentNodes]);

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

  const closeContextMenu = () => setContextMenu(null);

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
          onPaneClick={closeContextMenu}
          className="bg-[var(--color-bg-secondary)]"
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="var(--color-border-subtle)" />
          <Controls className="!rounded-[var(--radius-base)] !border !border-[var(--color-border-default)] !shadow-sm" />
        </ReactFlow>

        <div className="absolute bottom-2 left-2 z-10 rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)]/80 px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)] backdrop-blur-sm border border-[var(--color-border-default)]">
          {Math.round(zoom * 100)}%
        </div>

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
