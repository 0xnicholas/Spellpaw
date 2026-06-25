import { describe, it, expect } from 'vitest';
import { useCanvasStore } from './canvasStore';

// Legacy 'copilotCard' type 已从 CanvasNodeType union 移除（v2 重构）。
// 测试中的 v3 state 仍包含遗留节点，所以需要通过 unknown 转换。
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
    // 通过 unknown 转换：v3 state 包含遗留 copilotCard literal
    const migratedRaw = getMigrate()(v3State as never, 3);
    const migrated = (Array.isArray(migratedRaw) ? migratedRaw[0] : migratedRaw) as typeof v3State;
    const firstNode = migrated.canvases.proj_1.nodes[0];
    expect(firstNode.type).toBe('art');
    expect((firstNode.data as Record<string, unknown>).thumbnail).toBe('http://img.png');

    const secondNode = migrated.canvases.proj_1.nodes[1];
    expect(secondNode.type).toBe('videoClip');
    expect((secondNode.data as Record<string, unknown>).isPlaceholder).toBe(true);

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
    const resultRaw = getMigrate()(v4State as never, 4);
    const result = (Array.isArray(resultRaw) ? resultRaw[0] : resultRaw) as typeof v4State;
    expect(result.canvases.proj_1.nodes[0]).toEqual(v4State.canvases.proj_1.nodes[0]);
  });
});