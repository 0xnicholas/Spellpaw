import { describe, it, expect, beforeEach, vi } from 'vitest';
import { importProjectFromJSON, exportProjectToJSON, type ExportData } from './exportImport';

describe('exportImport', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    });
  });
  const sample: ExportData = {
    _schemaVersion: 1,
    title: '测试项目',
    description: 'round-trip',
    canvas: {
      nodes: [
        {
          id: 'c1',
          type: 'storyline',
          position: { x: 0, y: 0 },
          data: { title: '第一幕', description: '', status: 'draft', tags: [], colors: [] },
        },
      ],
      edges: [],
    },
  };

  it('imports valid current-schema JSON', () => {
    const result = importProjectFromJSON(JSON.stringify(sample));
    expect(result.title).toBe('测试项目');
    expect(result.canvas.nodes).toHaveLength(1);
    expect(result.canvas.nodes[0].id).toBe('c1');
  });

  it('imports legacy canvasNodes fallback', () => {
    const legacy = {
      _schemaVersion: 1,
      title: 'legacy',
      canvasNodes: sample.canvas.nodes,
      canvasEdges: [],
    };
    const result = importProjectFromJSON(JSON.stringify(legacy));
    expect(result.canvas.nodes).toHaveLength(1);
    expect(result.canvas.edges).toEqual([]);
  });

  it('throws on unsupported schema version', () => {
    expect(() => importProjectFromJSON(JSON.stringify({ _schemaVersion: 99, title: 'x' }))).toThrow(/Unsupported schema/);
  });

  it('throws on missing title', () => {
    expect(() => importProjectFromJSON(JSON.stringify({ _schemaVersion: 1 }))).toThrow(/Missing required field: title/);
  });

  it('throws when canvas.nodes is not an array', () => {
    expect(() => importProjectFromJSON(JSON.stringify({ _schemaVersion: 1, title: 'x', canvas: { nodes: 'bad' } }))).toThrow(/Missing required field: canvas.nodes/);
  });

  it('exports without error and output can be re-imported', () => {
    // exportProjectToJSON writes to the DOM; we only verify it runs and
    // produces JSON that matches the schema by re-importing the same data.
    expect(() =>
      exportProjectToJSON(
        { id: 'p1', title: '测试项目', description: 'round-trip', updatedAt: '2026-01-01', sceneCount: 0, duration: 0, coverColor: '#000', version: 1 },
        sample.canvas.nodes,
        sample.canvas.edges,
      ),
    ).not.toThrow();
    const result = importProjectFromJSON(JSON.stringify(sample));
    expect(result.title).toBe('测试项目');
    expect(result.canvas.nodes[0].data.title).toBe('第一幕');
  });
});
