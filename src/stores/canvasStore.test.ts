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
});
