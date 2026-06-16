import { describe, it, expect, beforeEach } from 'vitest';
import { applyStyle } from './applyStyle';
import { providerRegistry } from '../registry';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';

function seedProject() {
  useProjectStore.setState({
    currentProjectId: 'proj_1',
    projects: [{ id: 'proj_1', title: 'Test', description: '', updatedAt: '', sceneCount: 0, duration: 0, coverColor: '#6366f1' }],
    trees: {
      proj_1: {
        id: 'tree_root_proj_1',
        type: 'project',
        title: 'Test',
        status: 'draft',
        children: [
          {
            id: 'scene-1',
            type: 'scene',
            title: 'Scene 1',
            status: 'draft',
            metadata: { description: 'A test scene', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
          },
        ],
      },
    },
  });
  useCanvasStore.setState({
    canvases: {
      proj_1: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    },
  });
}

function registerFakeProvider(capabilities: string[] = ['text2image']) {
  providerRegistry.register({
    id: 'fake',
    name: 'Fake Provider',
    supportedMedia: ['image'],
    capabilities: capabilities as import('../types').Capability[],
    requiredConfigKeys: [],
    isConfigured: () => true,
    configure: () => {},
    estimateCost: () => ({ amount: 1, unit: 'image' }),
    submit: async () => ({ taskId: 't1', status: 'done', resultUrl: 'https://example.com/styled.png' }),
  });
}

describe('applyStyle', () => {
  beforeEach(() => {
    providerRegistry.clear?.();
    seedProject();
  });

  it('returns error when source card does not exist', async () => {
    registerFakeProvider();
    const result = await applyStyle({ action: 'apply_style', sourceCardId: 'missing', stylePrompt: 'noir' });
    expect(result.success).toBe(false);
  });

  it('creates styled art card from stylePrompt', async () => {
    useCanvasStore.getState().addNode({
      id: 'card-1',
      type: 'art',
      position: { x: 0, y: 0 },
      data: { title: 'Reference', generatedPrompt: 'original prompt', linkedTreeNodeId: 'scene-1', status: 'draft' as const },
    });
    registerFakeProvider();

    const result = await applyStyle({ action: 'apply_style', sourceCardId: 'card-1', stylePrompt: 'cyberpunk neon' });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('expected success');
    expect(result.cardIds).toHaveLength(1);
  });

  it('creates styled art card from styleCardId', async () => {
    useCanvasStore.getState().addNode({
      id: 'card-1',
      type: 'art',
      position: { x: 0, y: 0 },
      data: { title: 'Reference', generatedPrompt: 'original prompt', linkedTreeNodeId: 'scene-1', status: 'draft' as const },
    });
    useCanvasStore.getState().addNode({
      id: 'style-card',
      type: 'art',
      position: { x: 100, y: 0 },
      data: { title: 'Watercolor', generatedPrompt: 'watercolor style', status: 'draft' as const },
    });
    registerFakeProvider();

    const result = await applyStyle({ action: 'apply_style', sourceCardId: 'card-1', styleCardId: 'style-card' });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('expected success');
    expect(result.cardIds).toHaveLength(1);
  });
});
