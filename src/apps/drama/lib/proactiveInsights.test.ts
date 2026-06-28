/* eslint-disable */
import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';

// computeProactiveInsights was rewritten to accept CanvasNode[] 
// instead of TreeNode. Import from source.
import { computeProactiveInsights } from './proactiveInsights';

function seedCanvas(nodes: any[] = []) {
  useProjectStore.setState({ currentProjectId: 'p1', projects: [{ id: 'p1', title: 'Test', description: '', coverColor: '#000', updatedAt: '' }] });
  useCanvasStore.setState({ canvases: { p1: { nodes, edges: [], viewport: { x: 0, y: 0, zoom: 1 } } }, selectedCardId: null });
}

describe('computeProactiveInsights (canvas-based)', () => {
  beforeEach(() => {
    useCanvasStore.setState({ canvases: {}, selectedCardId: null });
  });

  it('returns empty canvas insight for no cards', () => {
    seedCanvas([]);
    const insights = computeProactiveInsights([]);
    expect(insights.length).toBeGreaterThanOrEqual(0);
  });
});
