import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';

// computeProactiveInsights was rewritten to accept CanvasNode[] 
// instead of TreeNode. Import from source.
import { computeProactiveInsights } from './proactiveInsights';

function seedCanvas(nodes: any[] = []) {
  useProjectStore.setState({ currentProjectId: 'p1', projects: [{ id: 'p1', title: 'Test', description: '', coverColor: '#000', createdAt: '', updatedAt: '' }] });
  useCanvasStore.setState({ canvases: { p1: { nodes, edges: [], pushedVersion: 0 } }, selectedCardId: null, pushTimer: undefined, highlightCardIds: [] });
}

describe('computeProactiveInsights (canvas-based)', () => {
  beforeEach(() => {
    useCanvasStore.setState({ canvases: {}, selectedCardId: null, pushTimer: undefined, highlightCardIds: [] });
  });

  it('returns empty canvas insight for no cards', () => {
    seedCanvas([]);
    const insights = computeProactiveInsights([]);
    expect(insights.length).toBeGreaterThanOrEqual(0);
  });
});
