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

  describe('deleteSession', () => {
    it('calls DELETE on the session endpoint', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 204 });
      await spellpawProvider.deleteSession('session-xyz');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('http://localhost:3002/api/v1/sessions/session-xyz');
      expect((init as RequestInit).method).toBe('DELETE');
    });

    it('treats 404 as success (idempotent)', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 404 });
      await expect(spellpawProvider.deleteSession('gone')).resolves.toBeUndefined();
    });

    it('does not throw on network error (best-effort cleanup)', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      await expect(spellpawProvider.deleteSession('session-net')).resolves.toBeUndefined();
    });

    it('sends the same auth headers as other endpoints', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 204 });
      await spellpawProvider.deleteSession('session-h');
      const init = fetchMock.mock.calls[0][1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer test-token');
      expect(headers['X-LLM-Provider']).toBe('deepseek');
    });
  });
});
