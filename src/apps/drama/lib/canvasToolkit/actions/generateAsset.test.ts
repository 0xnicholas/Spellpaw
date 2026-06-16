import { describe, it, expect, beforeEach } from 'vitest';
import { generateAsset } from './generateAsset';
import { providerRegistry } from '../registry';
import { createOpenAIProvider } from '../providers/openaiProvider';
import { useProjectStore } from '@drama/stores/projectStore';

describe('generateAsset', () => {
  beforeEach(() => {
    providerRegistry.clear?.();
    useProjectStore.setState({
      currentProjectId: 'proj_1',
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
  });

  it('returns error when no provider configured', async () => {
    const result = await generateAsset({
      action: 'generate_asset',
      nodeId: 'scene-1',
      mediaType: 'image',
    });
    expect(result.success).toBe(false);
  });

  it('creates a card when provider returns synchronous URL', async () => {
    const provider = createOpenAIProvider();
    provider.configure({ apiKey: 'sk-test' });
    // Mock submit
    provider.submit = async () => ({ taskId: 't1', status: 'done', resultUrl: 'https://example.com/img.png' });
    providerRegistry.register(provider);

    const result = await generateAsset({
      action: 'generate_asset',
      nodeId: 'scene-1',
      mediaType: 'image',
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('expected success');
    expect(result.cardIds).toHaveLength(1);
  });
});
