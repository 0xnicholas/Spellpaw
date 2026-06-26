/* eslint-disable */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from './canvasStore';
import { useProjectStore } from './projectStore';

describe('canvasStore', () => {
  beforeEach(() => {
    // Ensure we have a project set so canvas operations work
    useProjectStore.setState({
      projects: [{ id: 'proj_1', title: 'Test', description: '', updatedAt: '', sceneCount: 0, duration: 0, coverColor: '#6366f1' }]},
      currentProjectId: 'proj_1',
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
      type: 'sceneCard' as const,
      position: { x: 0, y: 0 },
      data: { title: 'Test', status: 'draft' as const },
    };
    useCanvasStore.getState().addNode(node);
    expect(useCanvasStore.getState().getCurrentNodes()).toHaveLength(1);
    expect(useCanvasStore.getState().getCurrentNodes()[0].id).toBe('test_1');
  });

  it('removes node', () => {
    const node = {
      id: 'test_1',
      type: 'sceneCard' as const,
      position: { x: 0, y: 0 },
      data: { title: 'Test', status: 'draft' as const },
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
      data: { title: 'Old', status: 'draft' as const },
    });
    useCanvasStore.getState().updateNodeData('test_1', { title: 'New' });
    expect(useCanvasStore.getState().getCurrentNodes()[0].data.title).toBe('New');
  });

  it('duplicates node as orphan', () => {
    useCanvasStore.getState().addNode({
      id: 'test_1',
      type: 'sceneCard',
      position: { x: 0, y: 0 },
      data: { title: 'Original', : 'tree_1' },
    });
    useCanvasStore.getState().duplicateNode('test_1');
    const nodes = useCanvasStore.getState().getCurrentNodes();
    expect(nodes).toHaveLength(2);
    expect(nodes[1].data.title).toBe('Original');
    expect(nodes[1].data.).toBeUndefined();
  });
});

describe('selectedCardId', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [{ id: 'proj_1', title: 'Test', description: '', updatedAt: '', sceneCount: 0, duration: 0, coverColor: '#6366f1' }]},
      currentProjectId: 'proj_1',
    });
    useCanvasStore.setState({
      canvases: {
        'proj_1': { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      },
    });
  });

  it('starts null', () => {
    expect(useCanvasStore.getState().selectedCardId).toBeNull();
  });

  it('setSelectedCardId sets and getSelectedCard returns the node', () => {
    useCanvasStore.getState().addNode({
      id: 'card_1',
      type: 'script',
      position: { x: 0, y: 0 },
      data: { title: 'Scene 1', status: 'draft' as const },
    });
    useCanvasStore.getState().setSelectedCardId('card_1');
    expect(useCanvasStore.getState().selectedCardId).toBe('card_1');
    const card = useCanvasStore.getState().getSelectedCard();
    expect(card).not.toBeNull();
    expect(card!.id).toBe('card_1');
    expect(card!.data.title).toBe('Scene 1');
  });

  it('setSelectedCardId(null) clears selection', () => {
    useCanvasStore.getState().addNode({
      id: 'card_1',
      type: 'script',
      position: { x: 0, y: 0 },
      data: { title: 'Scene 1', status: 'draft' as const },
    });
    useCanvasStore.getState().setSelectedCardId('card_1');
    useCanvasStore.getState().setSelectedCardId(null);
    expect(useCanvasStore.getState().selectedCardId).toBeNull();
    expect(useCanvasStore.getState().getSelectedCard()).toBeNull();
  });

  it('getSelectedCard returns null when node does not exist', () => {
    useCanvasStore.getState().setSelectedCardId('nonexistent');
    expect(useCanvasStore.getState().getSelectedCard()).toBeNull();
  });

  it('selectedCardId is excluded from persist partialize', () => {
    useCanvasStore.getState().setSelectedCardId('card_1');
    const opts = useCanvasStore.persist.getOptions();
    const partial = opts.partialize!(useCanvasStore.getState());
    expect(partial).not.toHaveProperty('selectedCardId');
  });
});
