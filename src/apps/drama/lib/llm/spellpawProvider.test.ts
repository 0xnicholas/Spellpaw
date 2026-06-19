import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spellpawProvider } from './spellpawProvider';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

vi.mock('@/shared/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ token: 'test-token' }),
  },
}));

vi.mock('@console/lib/llmSettings', () => ({
  getLLMSettings: () => ({
    provider: 'deepseek',
    apiKey: 'sk-deepseek',
    apiKeys: { deepseek: 'sk-deepseek' },
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-v4-pro',
  }),
}));

vi.mock('@/shared/config', () => ({
  config: {
    serverBase: 'http://localhost:3002',
    llmBase: '',
  },
}));

describe('spellpawProvider', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('subscribeSSE sends LLM settings headers including API key', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      body: null,
    });

    spellpawProvider.subscribeSSE('session-1', () => {});

    // Wait for the async fetch to be invoked.
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const call = fetchMock.mock.calls[0];
    const url = call[0] as string;
    const init = call[1] as RequestInit;
    const headers = init.headers as Record<string, string>;

    expect(url).toBe('http://localhost:3002/api/v1/sessions/session-1/events');
    expect(headers.Authorization).toBe('Bearer test-token');
    expect(headers['X-LLM-Provider']).toBe('deepseek');
    expect(headers['X-LLM-API-Key']).toBe('sk-deepseek');
    expect(headers['X-LLM-Base-URL']).toBe('https://api.deepseek.com/v1');
    expect(headers['X-LLM-Model']).toBe('deepseek-v4-pro');
  });
});
