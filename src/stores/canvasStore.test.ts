import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from './canvasStore';

describe('canvasStore', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      persistedNodes: [],
      persistedEdges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
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
    expect(useCanvasStore.getState().persistedNodes).toHaveLength(1);
    expect(useCanvasStore.getState().persistedNodes[0].id).toBe('test_1');
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
    expect(useCanvasStore.getState().persistedNodes).toHaveLength(0);
  });

  it('adds edge', () => {
    const edge = { id: 'e1', source: 'a', target: 'b' };
    useCanvasStore.getState().addEdge(edge);
    expect(useCanvasStore.getState().persistedEdges).toHaveLength(1);
  });

  it('updates node data', () => {
    useCanvasStore.getState().addNode({
      id: 'test_1',
      type: 'sceneCard',
      position: { x: 0, y: 0 },
      data: { title: 'Old', status: 'draft' },
    });
    useCanvasStore.getState().updateNodeData('test_1', { title: 'New' });
    expect(useCanvasStore.getState().persistedNodes[0].data.title).toBe('New');
  });

  it('duplicates node as orphan', () => {
    useCanvasStore.getState().addNode({
      id: 'test_1',
      type: 'sceneCard',
      position: { x: 0, y: 0 },
      data: { title: 'Original', linkedTreeNodeId: 'tree_1' },
    });
    useCanvasStore.getState().duplicateNode('test_1');
    const dup = useCanvasStore.getState().persistedNodes[1];
    expect(dup.data.title).toBe('Original');
    expect(dup.data.linkedTreeNodeId).toBeUndefined();
  });
});
