import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';

import { generateVariants } from './generateVariants';
import { providerRegistry } from '../registry';

describe('generateVariants', () => {
  beforeEach(() => {
    providerRegistry.clear?.();
    useProjectStore.setState({ currentProjectId: 'proj_1', projects: [{ id: 'proj_1', title: 'Test', description: '', updatedAt: '', sceneCount: 0, duration: 0, coverColor: '#6366f1' }] });
    useCanvasStore.setState({ canvases: { proj_1: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } } } });
  });

  it('returns error when no provider configured', async () => {
    const result = await generateVariants({ action: 'generate_variants', mediaType: 'image', prompt: 'test' });
    expect(result.success).toBe(false);
  });
});
