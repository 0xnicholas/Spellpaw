import { describe, it, expect, beforeEach } from 'vitest';
import { batchApplyStyle } from './batchApplyStyle';
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
          {
            id: 'scene-2',
            type: 'scene',
            title: 'Scene 2',
            status: 'draft',
            metadata: { description: 'Another scene', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
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

function registerFakeProvider() {
  let callCount = 0;
  providerRegistry.register({
    id: 'fake',
    name: 'Fake Provider',
    supportedMedia: ['image'],
    capabilities: ['text2image'],
    requiredConfigKeys: [],
    isConfigured: () => true,
    configure: () => {},
    estimateCost: () => ({ amount: 1, unit: 'image' }),
    submit: async () => {
      callCount++;
      return { taskId: `t${callCount}`, status: 'done', resultUrl: `https://example.com/img${callCount}.png` };
    },
  });
}

describe('batchApplyStyle', () => {
  beforeEach(() => {
    providerRegistry.clear?.();
    seedProject();
  });

  it('returns error when no provider configured', async () => {
    const result = await batchApplyStyle({
      action: 'batch_apply_style',
      nodeIds: ['scene-1'],
      stylePrompt: 'noir',
    });
    expect(result.success).toBe(false);
  });

  it('creates styled cards for multiple nodes', async () => {
    registerFakeProvider();
    const result = await batchApplyStyle({
      action: 'batch_apply_style',
      nodeIds: ['scene-1', 'scene-2'],
      stylePrompt: 'cyberpunk neon',
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('expected success');
    expect(result.cardIds).toHaveLength(2);
  });
});
