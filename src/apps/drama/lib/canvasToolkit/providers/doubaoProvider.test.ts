import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDoubaoProvider } from './doubaoProvider';

describe('doubaoProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('is not configured without an api key', () => {
    const provider = createDoubaoProvider();
    expect(provider.isConfigured()).toBe(false);
  });

  it('reads api key from configure()', () => {
    const provider = createDoubaoProvider();
    provider.configure({ doubaoApiKey: 'sk-test' });
    expect(provider.isConfigured()).toBe(true);
  });

  it('reads api key from localStorage settings', () => {
    localStorage.setItem('spellpaw_settings', JSON.stringify({ doubaoApiKey: 'sk-ls' }));
    const provider = createDoubaoProvider();
    expect(provider.isConfigured()).toBe(true);
  });

  it('returns failed when api key missing', async () => {
    const provider = createDoubaoProvider();
    const task = await provider.submit({ type: 'image', capability: 'text2image', prompt: 'a cat' });
    expect(task.status).toBe('failed');
  });

  it('submits image generation and returns url', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ url: 'https://example.com/doubao.png' }] }),
    } as unknown as Response);

    const provider = createDoubaoProvider();
    provider.configure({ doubaoApiKey: 'sk-test' });

    const task = await provider.submit({ type: 'image', capability: 'text2image', prompt: 'a cat' });

    expect(task.status).toBe('done');
    expect(task.resultUrl).toBe('https://example.com/doubao.png');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://ark.cn-beijing.volces.com/api/v3/images/generations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer sk-test' }),
      }),
    );
  });

  it('submits video task and polls until done', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'task-123', status: 'queued' }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'task-123', status: 'succeeded', content: { video_url: 'https://example.com/video.mp4' } }),
      } as unknown as Response);

    const provider = createDoubaoProvider();
    provider.configure({ doubaoApiKey: 'sk-test' });

    const task = await provider.submit({ type: 'video', capability: 'text2video', prompt: 'a cat playing' });
    expect(task.status).toBe('pending');
    expect(task.taskId).toBe('task-123');

    const polled = await provider.poll!('task-123');
    expect(polled.status).toBe('done');
    expect(polled.resultUrl).toBe('https://example.com/video.mp4');
  });
});
