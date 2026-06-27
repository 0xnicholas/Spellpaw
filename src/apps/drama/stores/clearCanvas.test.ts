import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { toolRouter } from '@drama/stores/toolRouter';
import { addEnrichedCard } from '@drama/stores/toolRouter/cards';
import * as syncEngine from '@drama/lib/syncEngine';

describe('clear_canvas', () => {
  beforeEach(() => {
    useCanvasStore.setState({ canvases: {}, selectedCardId: null });
  });

  it('adds 17 cards then clear_canvas empties them all atomically', async () => {
    useProjectStore.getState().createProject('proj', '', '#6366f1');
    for (let i = 0; i < 17; i++) {
      await addEnrichedCard('sceneCard', { title: `卡片 ${i + 1}` });
    }
    expect(useCanvasStore.getState().getCurrentNodes().length).toBe(17);

    // Stub triggerPushNow so we don't actually hit the server
    const triggerSpy = vi.spyOn(syncEngine, 'triggerPushNow').mockResolvedValue();

    const result = await toolRouter.clear_canvas({ action: 'clear_canvas' });
    expect(result).toContain('已清空画布');
    expect(result).toContain('17');
    expect(useCanvasStore.getState().getCurrentNodes().length).toBe(0);
    expect(triggerSpy).toHaveBeenCalledTimes(1);
  });

  it('clear_canvas with filter: only sceneCard', async () => {
    useProjectStore.getState().createProject('proj', '', '#6366f1');
    await addEnrichedCard('sceneCard', { title: 'A' });
    await addEnrichedCard('script', { title: 'B' });
    await addEnrichedCard('sceneCard', { title: 'C' });
    expect(useCanvasStore.getState().getCurrentNodes().length).toBe(3);

    vi.spyOn(syncEngine, 'triggerPushNow').mockResolvedValue();

    const result = await toolRouter.clear_canvas({
      action: 'clear_canvas',
      filter: { type: 'sceneCard' },
    });
    expect(result).toContain('2');
    const remaining = useCanvasStore.getState().getCurrentNodes();
    expect(remaining.length).toBe(1);
    expect(remaining[0].type).toBe('script');
  });

  it('clear_canvas on empty canvas returns friendly message', async () => {
    useProjectStore.getState().createProject('proj', '', '#6366f1');
    vi.spyOn(syncEngine, 'triggerPushNow').mockResolvedValue();

    const result = await toolRouter.clear_canvas({ action: 'clear_canvas' });
    expect(result).toContain('画布已为空');
  });
});