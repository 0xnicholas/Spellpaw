import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useProjectStore } from './projectStore';
import { useCanvasStore } from './canvasStore';
import { useCustomTemplateStore } from './customTemplateStore';
import { toolRouter } from './toolRouter';
import { addEnrichedCard } from './toolRouter/cards';
import { providerRegistry, useTaskStore } from '@drama/lib/canvasToolkit';
import type { GenerationProvider } from '@drama/lib/canvasToolkit';
import type { NarrativeTemplate } from '@drama/types';

// Canvas fixture
function seedCanvas(): void {
  const store = useProjectStore.getState();
  store.createProject('test-proj', '', '#6366f1');
  const cs = useCanvasStore.getState();
  cs.setState(s => ({
    canvases: {
      ...(s as any).canvases,
      [store.currentProjectId!]: {
        nodes: [
          { id: 'card-1', type: 'storyline', position: { x: 50, y: 50 }, data: { title: '第一幕', description: '', status: 'draft', metadata: { type: 'act' } } },
          { id: 'card-2', type: 'sceneCard', position: { x: 50, y: 300 }, data: { title: '场景 1', description: '', status: 'draft', duration: 30, metadata: { type: 'scene' }, children: [{ id: 'shot-1', type: 'shot', title: '镜头 1', data: { duration: 5, shotType: 'wide' } }] } },
        ],
        edges: [],
        pushedVersion: 0,
      },
    },
    selectedCardId: null,
    pushTimer: undefined,
    highlightCardIds: [],
  }));
}

describe('toolRouter — analysis tools (canvas-based)', () => {
  beforeEach(() => {
    useCanvasStore.setState({ canvases: {}, selectedCardId: null, pushTimer: undefined, highlightCardIds: [] });
  });

  it('analyze_structure returns diagnostic JSON', async () => {
    seedCanvas();
    const result = await toolRouter.analyze_structure({ action: 'analyze_structure' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.summary).toContain('诊断');
  });

  it('get_pacing_report returns pacing analysis JSON', async () => {
    seedCanvas();
    const result = await toolRouter.get_pacing_report({ action: 'get_pacing_report' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.summary).toContain('节奏');
  });

  it('match_template returns template match JSON', async () => {
    seedCanvas();
    const result = await toolRouter.match_template({ action: 'match_template' });
    const parsed = JSON.parse(result);
    expect(parsed).toBeDefined();
  });

  it('optimize_pacing returns adjustment plan JSON', async () => {
    seedCanvas();
    const result = await toolRouter.optimize_pacing({ action: 'optimize_pacing' });
    const parsed = JSON.parse(result);
    expect(typeof parsed.success).toBe('boolean');
  });
});

describe('toolRouter — generate_storyboard', () => {
  beforeEach(() => {
    useCanvasStore.setState({ canvases: {}, selectedCardId: null, pushTimer: undefined, highlightCardIds: [] });
    providerRegistry.clear();
  });

  function fakeProvider(opts: { id: string; name?: string; configured?: boolean; resultUrl?: string; async?: boolean }): GenerationProvider {
    const id = opts.id;
    return {
      id, name: opts.name ?? id, supportedMedia: ['image'], capabilities: ['text2image'],
      requiredConfigKeys: [`${id}Key`], isConfigured: () => opts.configured ?? true, configure: () => {},
      estimateCost: () => ({ amount: 1, unit: 'image' }),
      submit: async () => opts.async ? { taskId: `${id}_task`, status: 'pending' } : { taskId: `${id}_task`, status: 'done', resultUrl: opts.resultUrl ?? `https://${id}.example/img.png` },
      poll: async (taskId: string) => ({ taskId, status: 'done', resultUrl: opts.resultUrl ?? `https://${id}.example/img.png` }),
    };
  }

  it('generates storyboard from a canvas card', async () => {
    seedCanvas();
    providerRegistry.register(fakeProvider({ id: 'mock', name: 'Mock' }));
    const result = await toolRouter.generate_storyboard({ action: 'generate_storyboard', cardId: 'card-2' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });
});

describe('toolRouter — kickstart_project', () => {
  beforeEach(() => {
    useCanvasStore.setState({ canvases: {}, selectedCardId: null, pushTimer: undefined, highlightCardIds: [] });
    useCustomTemplateStore.setState({ customTemplates: [{
      id: 'action-template', name: '动作短片', category: 'action', description: '', targetDuration: 60, targetPlatform: 'portrait',
      structure: { acts: [{ title: '第一幕', description: '', scenes: [{ title: '场景1', description: '', suggestedShotTypes: ['wide'], metadata: { duration: 10 } }] }] },
      tags: [], version: '1',
    }] });
  });

  it('creates project from theme', async () => {
    const result = await toolRouter.kickstart_project({ action: 'kickstart_project', theme: 'Test Project' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });
});

describe('toolRouter — cards', () => {
  beforeEach(() => {
    useCanvasStore.setState({ canvases: {}, selectedCardId: null, pushTimer: undefined, highlightCardIds: [] });
    useProjectStore.setState(p => {
      if (!p.currentProjectId) {
        const id = useProjectStore.getState().createProject('test', '', '#6366f1');
        return { currentProjectId: id };
      }
      return {};
    });
  });

  it('add_card returns JSON', async () => {
    const result = await toolRouter.add_card({ title: 'Test Card', type: 'art' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.affectedCardIds?.length).toBeGreaterThan(0);
  });

  it('update_card returns JSON', async () => {
    const cards = useCanvasStore.getState().canvases;
    const pid = useProjectStore.getState().currentProjectId!;
    useCanvasStore.setState({ canvases: { ...cards, [pid]: { nodes: [{ id: 'card-x', type: 'art', position: { x: 0, y: 0 }, data: { title: 'Old', status: 'draft' } }], edges: [], pushedVersion: 0 } } });
    const result = await toolRouter.update_card({ cardId: 'card-x', data: { title: 'New' } });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });

  it('delete_card returns JSON', async () => {
    const cards = useCanvasStore.getState().canvases;
    const pid = useProjectStore.getState().currentProjectId!;
    useCanvasStore.setState({ canvases: { ...cards, [pid]: { nodes: [{ id: 'card-y', type: 'art', position: { x: 0, y: 0 }, data: { title: 'to delete', status: 'draft' } }], edges: [], pushedVersion: 0 } } });
    const result = await toolRouter.delete_card({ cardId: 'card-y' });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });

  it('get_canvas lists cards', async () => {
    const result = await toolRouter.get_canvas({});
    expect(typeof result).toBe('string');
  });

  it('clear_canvas removes all cards', async () => {
    const pid = useProjectStore.getState().currentProjectId!;
    useCanvasStore.setState({ canvases: { [pid]: { nodes: [{ id: 'c1', type: 'art', position: { x: 0, y: 0 }, data: { title: 'x', status: 'draft' } }], edges: [], pushedVersion: 0 } } });
    const result = await toolRouter.clear_canvas({});
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });
});

describe('addEnrichedCard', () => {
  beforeEach(() => {
    useCanvasStore.setState({ canvases: {}, selectedCardId: null, pushTimer: undefined, highlightCardIds: [] });
    useProjectStore.setState(p => {
      if (!p.currentProjectId) {
        const id = useProjectStore.getState().createProject('test', '', '#6366f1');
        return { currentProjectId: id };
      }
      return {};
    });
  });

  it('creates a card with validation', async () => {
    const card = await addEnrichedCard('art', { title: 'Test', status: 'draft' });
    expect(card.id).toBeDefined();
  });

  it('rejects with bad data', async () => {
    await expect(addEnrichedCard('invalidType' as any, { title: 'Bad' })).rejects.toThrow();
  });
});
