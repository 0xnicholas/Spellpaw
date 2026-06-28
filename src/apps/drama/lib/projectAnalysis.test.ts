import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { generatePacingReport } from './projectAnalysis';

function seedCanvas() {
  useProjectStore.setState({ currentProjectId: 'p1', projects: [{ id: 'p1', title: 'Test', description: '', coverColor: '#000', updatedAt: '' }] });
  useCanvasStore.setState({
    canvases: {
      p1: {
        nodes: [
          { id: 's1', type: 'sceneCard', position: { x: 0, y: 0 }, data: { title: 'Scene 1', duration: 30, status: 'draft', tags: [], colors: [], metadata: { type: 'scene' }, children: [{ id: 'sh1', type: 'shot', title: 'Shot 1', data: { duration: 10 } }] } },
          { id: 's2', type: 'sceneCard', position: { x: 0, y: 300 }, data: { title: 'Scene 2', duration: 20, status: 'draft', tags: [], colors: [], metadata: { type: 'scene' } } },
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    },
    selectedCardId: null,
  });
}

describe('generatePacingReport (canvas-based)', () => {
  beforeEach(() => {
    useCanvasStore.setState({ canvases: {}, selectedCardId: null });
  });

  it('returns report for canvas cards', () => {
    seedCanvas();
    const report = generatePacingReport();
    expect(report).toBeDefined();
    expect(report.totalDuration).toBe(50);
    expect(report.sceneCount).toBe(2);
  });

  it('handles empty canvas', () => {
    useProjectStore.setState({ currentProjectId: 'p1' });
    useCanvasStore.setState({ canvases: { p1: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } } } });
    const report = generatePacingReport();
    expect(report.sceneCount).toBe(0);
  });
});
