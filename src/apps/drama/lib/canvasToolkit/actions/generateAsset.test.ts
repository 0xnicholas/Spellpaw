import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';

import { generateAsset } from './generateAsset';
import { providerRegistry } from '../registry';

describe('generateAsset', () => {
  beforeEach(() => {
    providerRegistry.clear?.();
    useProjectStore.setState({ currentProjectId: 'proj_1', projects: [{ id: 'proj_1', title: 'Test', description: '', updatedAt: '', sceneCount: 0, duration: 0, coverColor: '#6366f1' }] });
    useCanvasStore.setState({ canvases: { proj_1: { nodes: [], edges: [] } } });
  });

  it('returns error when no provider configured', async () => {
    const result = await generateAsset({ mediaType: 'image', prompt: 'test' });
    expect(result.success).toBe(false);
    expect(result.message).toContain('provider');
  });
});
