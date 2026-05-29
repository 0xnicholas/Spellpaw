import { useCallback, useState, useEffect, useRef } from 'react';
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
  type ReactFlowInstance,
  type EdgeChange,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus } from 'lucide-react';

import { useCanvasStore } from '@/stores/canvasStore';
import { useProjectStore } from '@/stores/projectStore';
import { useDetailStore } from '@/stores/detailStore';
import type { CanvasNode, CanvasEdge } from '@/types';
import { SceneCardNode } from './nodes/SceneCardNode';
import { AssetCardNode } from './nodes/AssetCardNode';
import { NoteCardNode } from './nodes/NoteCardNode';
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog';
import { generateId } from '@/lib/utils';
import { collectScenes } from '@/lib/treeUtils';

const nodeTypes: NodeTypes = {
  sceneCard: SceneCardNode,
  assetCard: AssetCardNode,
  noteCard: NoteCardNode,
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
  const addNodeFromAsset = useCanvasStore((s) => s.addNodeFromAsset);
  const addNode = useCanvasStore((s) => s.addNode);
  const duplicateNode = useCanvasStore((s) => s.duplicateNode);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const selectNode = useProjectStore((s) => s.selectNode);
  const tree = useProjectStore((s) => s.getCurrentTree());
  const deleteTreeNode = useProjectStore((s) => s.deleteTreeNode);
  const focusCanvasLinkedId = useDetailStore((s) => s.focusCanvasLinkedId);
  const clearFocusCanvas = useDetailStore((s) => s.clearFocusCanvas);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ nodeId: string; isLinked: boolean } | null>(null);

  const persistedNodes = getCurrentNodes();
  const persistedEdges = getCurrentEdges();

  const [nodes, , onNodesChange] = useNodesState(persistedNodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(persistedEdges as Edge[]);

  // Focus on canvas card when DetailPanel requests it
  useEffect(() => {
    if (!focusCanvasLinkedId) return;
    const targetNode = nodes.find((n: Node) => n.data?.linkedTreeNodeId === focusCanvasLinkedId);
    if (targetNode) {
      setTimeout(() => {
        reactFlowRef.current?.fitView({ nodes: [targetNode], duration: 300, maxZoom: 1.5 });
        clearFocusCanvas();
      }, 50);
    } else {
      clearFocusCanvas();
    }
  }, [focusCanvasLinkedId, nodes, clearFocusCanvas]);

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

      addNodeFromAsset({ id: assetId, name: 'Asset', type: 'other', size: 0, status: 'ready', createdAt: '' }, position);
    },
    [addNodeFromAsset]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const linkedId = node.data?.linkedTreeNodeId as string | undefined;
      if (linkedId) {
        selectNode(linkedId);
      }
    },
    [selectNode]
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
      case 'edit':
        // Double-click simulation is handled in node components
        break;
      case 'duplicate':
        duplicateNode(contextMenu.nodeId);
        break;
      case 'delete': {
        const isLinked = !!contextMenu.data.linkedTreeNodeId;
        if (isLinked) {
          setDeleteConfirm({ nodeId: contextMenu.nodeId, isLinked: true });
        } else {
          removeNode(contextMenu.nodeId);
        }
        break;
      }
      case 'sync': {
        // Sync to Tree: show unlinked scenes submenu (handled differently)
        break;
      }
    }
    closeContextMenu();
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.isLinked) {
      const node = persistedNodes.find((n) => n.id === deleteConfirm.nodeId);
      if (node?.data.linkedTreeNodeId) {
        deleteTreeNode(node.data.linkedTreeNodeId);
      }
    }
    removeNode(deleteConfirm.nodeId);
    setDeleteConfirm(null);
  };

  const addNoteCard = () => {
    addNode({
      id: generateId('canvas_note_'),
      type: 'noteCard',
      position: { x: 200, y: 150 },
      data: { title: 'New Note', color: '#fef3c7' },
    });
  };

  // Collect unlinked scenes for sync-to-tree submenu
  const allScenes = tree ? collectScenes(tree) : [];
  const linkedIds = new Set(persistedNodes.map((n) => n.data.linkedTreeNodeId).filter(Boolean));
  const unlinkedScenes = allScenes.filter((s) => !linkedIds.has(s.id));

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 relative overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={(instance: ReactFlowInstance) => { reactFlowRef.current = instance; }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChangeWrapper}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={closeContextMenu}
          fitView
          proOptions={{ hideAttribution: true }}
          className="bg-[var(--color-bg-secondary)]"
        >
          <Background gap={20} size={1} color="var(--color-base-gray-200)" />
          <Controls className="!rounded-[var(--radius-base)] !border !border-[var(--color-border-default)] !shadow-sm" />
        </ReactFlow>

        {/* Floating Add Note button */}
        <button
          onClick={addNoteCard}
          className="absolute bottom-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent-500)] text-white shadow-md hover:bg-[var(--color-accent-600)]"
          title="Add Note Card"
        >
          <Plus className="h-4 w-4" />
        </button>

        {/* Custom Context Menu */}
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={closeContextMenu} />
            <div
              className="fixed z-50 min-w-[160px] rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] py-1 shadow-lg"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button onClick={() => handleContextAction('edit')} className="block w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--color-bg-secondary)]">
                Edit
              </button>
              <button onClick={() => handleContextAction('duplicate')} className="block w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--color-bg-secondary)]">
                Duplicate
              </button>
              {contextMenu.data.linkedTreeNodeId ? (
                <button onClick={() => handleContextAction('delete')} className="block w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-[var(--color-bg-secondary)]">
                  Delete
                </button>
              ) : (
                <button onClick={() => handleContextAction('delete')} className="block w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-[var(--color-bg-secondary)]">
                  Delete
                </button>
              )}
              {!contextMenu.data.linkedTreeNodeId && contextMenu.data.type !== 'noteCard' && unlinkedScenes.length > 0 && (
                <div className="border-t border-[var(--color-border-default)] mt-1 pt-1">
                  <span className="block px-3 py-1 text-[10px] text-[var(--color-text-tertiary)]">Sync to Tree</span>
                  {unlinkedScenes.map((scene) => (
                    <button
                      key={scene.id}
                      onClick={() => {
                        updateNodeData(contextMenu.nodeId, { linkedTreeNodeId: scene.id, title: scene.title, status: scene.status, description: scene.metadata?.description });
                        closeContextMenu();
                      }}
                      className="block w-full px-5 py-1 text-left text-xs hover:bg-[var(--color-bg-secondary)]"
                    >
                      {scene.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <DeleteConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Canvas Card"
        description={deleteConfirm?.isLinked ? "Also delete from project tree?" : "Are you sure you want to remove this card?"}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
