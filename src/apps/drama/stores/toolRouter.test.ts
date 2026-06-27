/* eslint-disable */
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
  const newId = store.createProject('test-proj', '', '#6366f1');
  useCanvasStore.setState((s) => ({
    canvases: {
      ...(s as any).canvases,
      [newId]: {
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
    useCustomTemplateStore.setState({ templates: [{
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

// ────────────────────────────────────────────────────────────────────────────
// Bug 1 + Bug 2 regression suite
//
// Bug 1: kickstart_project + applyTemplateToCanvas only know about templates
//        that have been pre-loaded into customTemplateStore. The builtin
//        templates (underdog-comeback, sweet-romance, ...) are shipped as
//        JSON files in /public/templates/ and were never reachable from
//        kickstart_project.
//
// Bug 2: spellpaw_apply_template is advertised in the system prompt and
//        called from two UI pages, but was never registered as a toolRouter
//        handler. Calling toolRouter.apply_template(...) throws.
// ────────────────────────────────────────────────────────────────────────────

describe('toolRouter — builtin template fallback', () => {
  // Path-resolved builtin template fixture. Mirrors what the browser would
  // fetch from /templates/{id}.spellpaw-template.json when served by Vite.
  function loadBuiltinTemplate(id: string): NarrativeTemplate {
    // Test file lives at src/apps/drama/stores/toolRouter.test.ts; templates
    // live at public/templates/. 4 levels up gets us to repo root.
    const path = resolve(__dirname, '../../../../public/templates', `${id}.spellpaw-template.json`);
    return JSON.parse(readFileSync(path, 'utf-8')) as NarrativeTemplate;
  }

  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    useCanvasStore.setState({ canvases: {}, selectedCardId: null, pushTimer: undefined, highlightCardIds: [] });
    useProjectStore.setState(p => {
      if (!p.currentProjectId) {
        const id = useProjectStore.getState().createProject('test-proj', '', '#6366f1');
        return { currentProjectId: id };
      }
      return {};
    });
    // Reset customTemplateStore so the builtin template must be re-discovered
    useCustomTemplateStore.setState({ templates: [] });

    // Mock global fetch to read the JSON fixture from disk. Mirrors the
    // real Vite dev-server behaviour where /templates/{id}.spellpaw-template.json
    // is served from public/.
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      const match = url.match(/\/templates\/([^.]+)\.spellpaw-template\.json$/);
      if (!match) {
        return new Response('not found', { status: 404 });
      }
      try {
        const body = loadBuiltinTemplate(match[1]);
        return new Response(JSON.stringify(body), { status: 200 });
      } catch {
        return new Response('missing fixture', { status: 404 });
      }
    }) as typeof fetch;
  });

  afterEach(() => {
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  it('kickstart_project resolves builtin templates via on-demand fetch', async () => {
    const result = await toolRouter.kickstart_project({
      action: 'kickstart_project',
      theme: '都市奇缘',
      genre: 'drama',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    // Should have created at least one storyline card (act) on the canvas.
    const pid = useProjectStore.getState().currentProjectId!;
    const cards = useCanvasStore.getState().canvases[pid]?.nodes ?? [];
    expect(cards.length).toBeGreaterThan(0);
  });

  it('apply_template handler exists and applies a builtin template', async () => {
    expect(typeof toolRouter.apply_template).toBe('function');

    const result = await toolRouter.apply_template({
      action: 'apply_template',
      templateId: 'sweet-romance',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    const pid = useProjectStore.getState().currentProjectId!;
    const cards = useCanvasStore.getState().canvases[pid]?.nodes ?? [];
    expect(cards.length).toBeGreaterThan(0);
  });

  it('apply_template returns a friendly error for unknown ids', async () => {
    const result = await toolRouter.apply_template({
      action: 'apply_template',
      templateId: 'definitely-not-a-real-template',
    });
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.summary).toMatch(/不存在|unknown/);
  });
});
