import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type XYPosition,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from '@/stores/canvasStore';
import { useProjectStore } from '@/stores/projectStore';
import { SceneCardNode } from './nodes/SceneCardNode';
import { AssetCardNode } from './nodes/AssetCardNode';
import { NoteCardNode } from './nodes/NoteCardNode';
import { generateId } from '@/lib/utils';

const nodeTypes: any = {
  sceneCard: SceneCardNode,
  assetCard: AssetCardNode,
  noteCard: NoteCardNode,
};

export function FlowCanvasPanel() {
  const persistedNodes = useCanvasStore((s) => s.persistedNodes);
  const persistedEdges = useCanvasStore((s) => s.persistedEdges);
  const syncNodes = useCanvasStore((s) => s.syncNodes);
  const syncEdges = useCanvasStore((s) => s.syncEdges);
  const addEdge = useCanvasStore((s) => s.addEdge);
  const addNodeFromAsset = useCanvasStore((s) => s.addNodeFromAsset);
  const selectNode = useProjectStore((s) => s.selectNode);

  const [nodes, , onNodesChange] = useNodesState(persistedNodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(persistedEdges as Edge[]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge = {
        id: generateId('edge_'),
        source: connection.source!,
        target: connection.target!,
        animated: true,
      };
      setEdges((eds) => [...eds, edge]);
      addEdge(edge as any);
    },
    [setEdges, addEdge]
  );

  const onNodeDragStop = useCallback(() => {
    syncNodes(nodes as any);
  }, [nodes, syncNodes]);

  const onEdgesChangeWrapper = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      syncEdges(edges as any);
    },
    [onEdgesChange, edges, syncEdges]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const assetId = event.dataTransfer.getData('assetId');
      if (!assetId) return;

      const bounds = (event.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect();
      if (!bounds) return;

      const position: XYPosition = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };

      addNodeFromAsset({ id: assetId, name: 'Asset', type: 'other', size: 0, status: 'ready', createdAt: '' } as any, position);
    },
    [addNodeFromAsset]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const treeId = node.id.replace('canvas_', '');
      if (treeId !== node.id) {
        selectNode(treeId);
      }
    },
    [selectNode]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 relative overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChangeWrapper}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeDoubleClick={onNodeDoubleClick}
          fitView
          proOptions={{ hideAttribution: true }}
          className="bg-[var(--color-bg-secondary)]"
        >
          <Background gap={20} size={1} color="var(--color-base-gray-200)" />
          <Controls className="!rounded-[var(--radius-base)] !border !border-[var(--color-border-default)] !shadow-sm" />
        </ReactFlow>
      </div>
    </div>
  );
}
