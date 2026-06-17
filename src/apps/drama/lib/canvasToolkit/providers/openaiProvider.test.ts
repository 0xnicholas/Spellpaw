import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createOpenAIProvider } from './openaiProvider';

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

describe('openaiProvider', () => {
  beforeEach(() => {
    mockGenerate.mockReset();
    localStorage.clear();
  });

  it('reports not configured when key is missing', () => {
    const provider = createOpenAIProvider();
    expect(provider.isConfigured()).toBe(false);
  });

  it('reports configured after configure()', () => {
    const provider = createOpenAIProvider();
    provider.configure({ apiKey: 'sk-test' });
    expect(provider.isConfigured()).toBe(true);
  });

  it('returns failed task when key missing', async () => {
    const provider = createOpenAIProvider();
    const result = await provider.submit({
      type: 'image',
      capability: 'text2image',
      prompt: 'test',
    });
    expect(result.status).toBe('failed');
  });

  it('returns done task with image URL', async () => {
    const provider = createOpenAIProvider();
    provider.configure({ apiKey: 'sk-test' });
    mockGenerate.mockResolvedValue({ data: [{ url: 'https://example.com/img.png' }] });

    const result = await provider.submit({
      type: 'image',
      capability: 'text2image',
      prompt: 'a dark alley',
    });

    expect(result.status).toBe('done');
    expect(result.resultUrl).toBe('https://example.com/img.png');
    expect(lastOpenAIConfig.baseURL).toBe('http://localhost:3002/api/v1/proxy/openai');
    expect(lastOpenAIConfig.apiKey).toBe('sk-test');
  });
});
