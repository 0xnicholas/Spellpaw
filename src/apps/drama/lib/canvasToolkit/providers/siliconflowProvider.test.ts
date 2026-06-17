import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSiliconflowProvider } from './siliconflowProvider';

const mockGenerate = vi.fn();
let lastOpenAIConfig: { apiKey?: string; baseURL?: string } = {};
vi.mock('openai', () => ({
  default: class MockOpenAI {
    constructor(config: { apiKey?: string; baseURL?: string }) {
      lastOpenAIConfig = config;
    }
    images = { generate: mockGenerate };
  },
}));

describe('siliconflowProvider', () => {
  beforeEach(() => {
    mockGenerate.mockReset();
    localStorage.clear();
  });

  it('reports not configured when key is missing', () => {
    const provider = createSiliconflowProvider();
    expect(provider.isConfigured()).toBe(false);
  });

  it('reports configured after configure()', () => {
    const provider = createSiliconflowProvider();
    provider.configure({ apiKey: 'sk-test' });
    expect(provider.isConfigured()).toBe(true);
  });

  it('returns failed task when key missing', async () => {
    const provider = createSiliconflowProvider();
    const result = await provider.submit({
      type: 'image',
      capability: 'text2image',
      prompt: 'test',
    });
    expect(result.status).toBe('failed');
  });

  it('returns done task with image URL', async () => {
    const provider = createSiliconflowProvider();
    provider.configure({ apiKey: 'sk-test' });
    mockGenerate.mockResolvedValue({ data: [{ url: 'https://example.com/img.png' }] });

    const result = await provider.submit({
      type: 'image',
      capability: 'text2image',
      prompt: 'a dark alley',
    });

    expect(result.status).toBe('done');
    expect(result.resultUrl).toBe('https://example.com/img.png');
    expect(lastOpenAIConfig.baseURL).toBe('http://localhost:3002/api/v1/proxy/siliconflow');
    expect(lastOpenAIConfig.apiKey).toBe('sk-test');
  });

  it('reads api key from localStorage settings', () => {
    localStorage.setItem('spellpaw_settings', JSON.stringify({ siliconflowApiKey: 'sk-ls' }));
    const provider = createSiliconflowProvider();
    expect(provider.isConfigured()).toBe(true);
  });

  it('uses configured model when provided', async () => {
    const provider = createSiliconflowProvider();
    provider.configure({ apiKey: 'sk-test', model: 'custom/model' });
    mockGenerate.mockResolvedValue({ data: [{ url: 'https://example.com/img.png' }] });

    await provider.submit({
      type: 'image',
      capability: 'text2image',
      prompt: 'test',
    });

    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'custom/model' })
    );
  });

  it('returns failed task when response has no image URL', async () => {
    const provider = createSiliconflowProvider();
    provider.configure({ apiKey: 'sk-test' });
    mockGenerate.mockResolvedValue({ data: [{}] });

    const result = await provider.submit({
      type: 'image',
      capability: 'text2image',
      prompt: 'test',
    });

    expect(result.status).toBe('failed');
    expect(result.error).toContain('No image URL');
  });

  it('returns failed task when API throws', async () => {
    const provider = createSiliconflowProvider();
    provider.configure({ apiKey: 'sk-test' });
    mockGenerate.mockRejectedValue(new Error('rate limit'));

    const result = await provider.submit({
      type: 'image',
      capability: 'text2image',
      prompt: 'test',
    });

    expect(result.status).toBe('failed');
    expect(result.error).toContain('rate limit');
  });
});
