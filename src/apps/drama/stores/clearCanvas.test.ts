 
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useCustomTemplateStore } from '@drama/stores/customTemplateStore';
import { toolRouter } from '@drama/stores/toolRouter';
import { addEnrichedCard } from '@drama/stores/toolRouter/cards';
import * as syncEngine from '@drama/lib/syncEngine';
import type { NarrativeTemplate } from '@drama/types';

function makeTestTemplate(): NarrativeTemplate {
  return {
    id: 'test-suspense',
    name: '测试悬疑',
    category: 'suspense',
    description: '用于测试',
    targetDuration: 60,
    targetPlatform: 'portrait',
    version: 1,
    tags: ['test'],
    stylePresets: { colorPalette: ['#000'], pacing: 'fast', visualStyle: 'noir' },
    structure: {
      acts: [
        {
          title: '第一幕',
          description: '开端',
          scenes: [
            { title: '场景 A', description: 'A', metadata: { duration: 15 } },
            { title: '场景 B', description: 'B', metadata: { duration: 15 } },
            { title: '场景 C', description: 'C', metadata: { duration: 15 } },
          ],
        },
      ],
    },
  };
}

describe('clear_canvas', () => {
  beforeEach(() => {
    useCanvasStore.setState({ canvases: {}, selectedCardId: null });
    useCustomTemplateStore.setState({ templates: [] });

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/templates/') && url.endsWith('.spellpaw-template.json')) {
        return new Response(JSON.stringify(makeTestTemplate()), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    }));
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

describe('kickstart_project dedup', () => {
  beforeEach(() => {
    useCanvasStore.setState({ canvases: {}, selectedCardId: null });
    useCustomTemplateStore.setState({ templates: [] });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/templates/') && url.endsWith('.spellpaw-template.json')) {
        return new Response(JSON.stringify(makeTestTemplate()), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    }));
  });

  it('two kickstarts do not duplicate cards for old scenes', async () => {
    useProjectStore.getState().createProject('p', '', '#6366f1');

    await toolRouter.kickstart_project({ action: 'kickstart_project', theme: 'a', genre: 'suspense' });
    const cards1 = useCanvasStore.getState().getCurrentNodes().length;
    expect(cards1).toBe(3);

    // Before fix: second kickstart would create 3 + 3 = 6 cards (3 new + 3 duplicates for old scenes).
    // After fix: only 3 NEW cards are created, the old 3 remain untouched → 6 total.
    await toolRouter.kickstart_project({ action: 'kickstart_project', theme: 'a', genre: 'suspense' });
    const cards2 = useCanvasStore.getState().getCurrentNodes().length;
    // 3 from first kickstart + 3 new scenes from second = 6 (no duplicates)
    expect(cards2).toBe(6);

    // Each scene should only have one card (no duplicate )
    const linkedIds = useCanvasStore.getState().getCurrentNodes().map((n) => n.data.title);
    expect(new Set(linkedIds).size).toBe(linkedIds.length);
  });
});
