import { describe, it, expect } from 'vitest';
import { createMockProvider } from './mockProvider';

describe('mockProvider', () => {
  it('is always configured', () => {
    const provider = createMockProvider();
    expect(provider.isConfigured()).toBe(true);
  });

  it('returns a synchronous placeholder image', async () => {
    const provider = createMockProvider();
    const task = await provider.submit({
      type: 'image',
      capability: 'text2image',
      prompt: 'a cyberpunk cat',
    });
    expect(task.status).toBe('done');
    expect(task.resultUrl).toContain('data:image/svg+xml');
  });

  it('supports video requests with an image placeholder', async () => {
    const provider = createMockProvider();
    const task = await provider.submit({
      type: 'video',
      capability: 'text2video',
      prompt: 'a short clip',
    });
    expect(task.status).toBe('done');
    expect(task.resultUrl).toContain('data:image/svg+xml');
  });
});
