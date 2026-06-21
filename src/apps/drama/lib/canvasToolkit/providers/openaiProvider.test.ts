import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createOpenAIProvider } from './openaiProvider';

const mockGenerate = vi.fn();
let lastOpenAIConfig: { apiKey?: string; baseURL?: string } = {};
let lastGenerateParams: Record<string, unknown> | undefined;
vi.mock('openai', () => ({
  default: class MockOpenAI {
    constructor(config: { apiKey?: string; baseURL?: string }) {
      lastOpenAIConfig = config;
    }
    images = {
      generate: (params: Record<string, unknown>) => {
        lastGenerateParams = params;
        return mockGenerate(params);
      },
    };
  },
}));

describe('openaiProvider', () => {
  beforeEach(() => {
    mockGenerate.mockReset();
    lastGenerateParams = undefined;
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

  // ── gpt-image-2 specific behaviour ─────────────────────────────

  it('sends gpt-image-2 model with response_format:url and no DALL-E style', async () => {
    const provider = createOpenAIProvider();
    provider.configure({ apiKey: 'sk-test' });
    mockGenerate.mockResolvedValue({ data: [{ url: 'https://example.com/img.png' }] });

    await provider.submit({
      type: 'image',
      capability: 'text2image',
      prompt: 'a cyberpunk street',
    });

    // gpt-image-2 does not support the DALL-E 3 `style` parameter; sending it
    // would cause a 400. response_format must be 'url' to get a URL back
    // (otherwise gpt-image series default to b64_json).
    expect(lastGenerateParams).toMatchObject({
      model: 'gpt-image-2',
      response_format: 'url',
      prompt: 'a cyberpunk street',
      n: 1,
      size: '1024x1024',
    });
    expect(lastGenerateParams).not.toHaveProperty('style');
  });

  it('honours custom size from input.options', async () => {
    const provider = createOpenAIProvider();
    provider.configure({ apiKey: 'sk-test' });
    mockGenerate.mockResolvedValue({ data: [{ url: 'https://example.com/img.png' }] });

    await provider.submit({
      type: 'image',
      capability: 'text2image',
      prompt: 'p',
      options: { size: '1536x1024' },
    });

    expect(lastGenerateParams?.size).toBe('1536x1024');
  });

  it('falls back to data URL when response is b64_json (gpt-image-2 default)', async () => {
    const provider = createOpenAIProvider();
    provider.configure({ apiKey: 'sk-test' });
    // gpt-image-2 defaults to b64_json; some proxies may ignore response_format
    const fakeB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    mockGenerate.mockResolvedValue({ data: [{ b64_json: fakeB64 }] });

    const result = await provider.submit({
      type: 'image',
      capability: 'text2image',
      prompt: 'p',
    });

    expect(result.status).toBe('done');
    expect(result.resultUrl).toBe(`data:image/png;base64,${fakeB64}`);
  });

  it('returns failed when response has neither url nor b64_json', async () => {
    const provider = createOpenAIProvider();
    provider.configure({ apiKey: 'sk-test' });
    mockGenerate.mockResolvedValue({ data: [{}] });

    const result = await provider.submit({
      type: 'image',
      capability: 'text2image',
      prompt: 'p',
    });

    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/No image data/);
  });

  it('surfaces OpenAI API errors as failed task', async () => {
    const provider = createOpenAIProvider();
    provider.configure({ apiKey: 'sk-test' });
    mockGenerate.mockRejectedValue(new Error('400 Bad Request: invalid model'));

    const result = await provider.submit({
      type: 'image',
      capability: 'text2image',
      prompt: 'p',
    });

    expect(result.status).toBe('failed');
    expect(result.error).toContain('invalid model');
  });

  it('exposes gpt-image-2 in the provider name (no longer DALL·E 3)', () => {
    const provider = createOpenAIProvider();
    expect(provider.name).toBe('OpenAI / GPT Image 2');
    expect(provider.id).toBe('openai');
  });
});
