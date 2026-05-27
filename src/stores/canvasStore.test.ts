import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from './canvasStore';
import { useProjectStore } from './projectStore';

describe('canvasStore', () => {
  beforeEach(() => {
    // Ensure we have a project set so canvas operations work
    useProjectStore.setState({
      projects: [{ id: 'proj_1', title: 'Test', description: '', updatedAt: '', sceneCount: 0, duration: 0, coverColor: '#6366f1' }],
      trees: { 'proj_1': { id: 'root', type: 'project', title: 'Test', status: 'draft' } },
      currentProjectId: 'proj_1',
      selectedNodeId: null,
    });
    useCanvasStore.setState({
      canvases: {
        'proj_1': { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      },
    });
  });

  it('adds node', () => {
    const node = {
      id: 'test_1',
      type: 'noteCard' as const,
      position: { x: 0, y: 0 },
      data: { title: 'Test' },
    };
    useCanvasStore.getState().addNode(node);
    expect(useCanvasStore.getState().getCurrentNodes()).toHaveLength(1);
    expect(useCanvasStore.getState().getCurrentNodes()[0].id).toBe('test_1');
  });

  it('removes node', () => {
    const node = {
      id: 'test_1',
      type: 'noteCard' as const,
      position: { x: 0, y: 0 },
      data: { title: 'Test' },
    };
    useCanvasStore.getState().addNode(node);
    useCanvasStore.getState().removeNode('test_1');
    expect(useCanvasStore.getState().getCurrentNodes()).toHaveLength(0);
  });

  it('adds edge', () => {
    const edge = { id: 'e1', source: 'a', target: 'b' };
    useCanvasStore.getState().addEdge(edge);
    expect(useCanvasStore.getState().getCurrentEdges()).toHaveLength(1);
  });

  it('updates node data', () => {
    useCanvasStore.getState().addNode({
      id: 'test_1',
      type: 'sceneCard',
      position: { x: 0, y: 0 },
      data: { title: 'Old', status: 'draft' },
    });
    useCanvasStore.getState().updateNodeData('test_1', { title: 'New' });
    expect(useCanvasStore.getState().getCurrentNodes()[0].data.title).toBe('New');
  });

  it('duplicates node as orphan', () => {
    useCanvasStore.getState().addNode({
      id: 'test_1',
      type: 'sceneCard',
      position: { x: 0, y: 0 },
      data: { title: 'Original', linkedTreeNodeId: 'tree_1' },
    });
    useCanvasStore.getState().duplicateNode('test_1');
    const nodes = useCanvasStore.getState().getCurrentNodes();
    expect(nodes).toHaveLength(2);
    expect(nodes[1].data.title).toBe('Original');
    expect(nodes[1].data.linkedTreeNodeId).toBeUndefined();
  });
});
