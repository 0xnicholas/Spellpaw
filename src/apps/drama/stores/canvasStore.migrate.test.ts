import { describe, it, expect } from 'vitest';
import { useCanvasStore } from './canvasStore';

describe('canvasStore persist migrate v3→v4', () => {
  const getMigrate = () => useCanvasStore.persist.getOptions().migrate!;

  it('converts copilotCard nodes in v3 persisted state', () => {
    const v3State = {
      canvases: {
        proj_1: {
          nodes: [
            {
              id: 'c1',
              type: 'copilotCard',
              position: { x: 0, y: 0 },
              data: { kind: 'image', status: 'done', result: { url: 'http://img.png' }, prompt: 'cat' },
            },
            {
              id: 'c2',
              type: 'copilotCard',
              position: { x: 0, y: 0 },
              data: { kind: 'video', status: 'idle', prompt: 'walk' },
            },
            {
              id: 's1',
              type: 'storyline',
              position: { x: 0, y: 0 },
              data: { title: 'existing' },
            },
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
    };
    const migrated = getMigrate()(v3State, 3) as typeof v3State;
    expect(migrated.canvases.proj_1.nodes[0].type).toBe('art');
    expect(migrated.canvases.proj_1.nodes[0].data.thumbnail).toBe('http://img.png');
    expect(migrated.canvases.proj_1.nodes[1].type).toBe('videoClip');
    expect(migrated.canvases.proj_1.nodes[1].data.isPlaceholder).toBe(true);
    expect(migrated.canvases.proj_1.nodes[2]).toEqual(v3State.canvases.proj_1.nodes[2]);
  });

  it('idempotent on v4 state (no double migration)', () => {
    const v4State = {
      canvases: {
        proj_1: {
          nodes: [
            { id: 'a1', type: 'art', position: { x: 0, y: 0 }, data: { title: 'x' } },
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
    };
    const result = getMigrate()(v4State, 4) as typeof v4State;
    expect(result.canvases.proj_1.nodes[0]).toEqual(v4State.canvases.proj_1.nodes[0]);
  });
});