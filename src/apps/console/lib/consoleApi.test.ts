import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateProfile, updatePassword, fetchCurrentUser, fetchSettings, updateSettings } from './consoleApi';
import { useAuthStore } from '@/shared/stores/authStore';

describe('consoleApi', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'test-token', isAuthenticated: true, user: null });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('updateProfile sends PATCH with auth header', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    const result = await updateProfile({ name: 'New Name' });
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/profile'),
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        }),
        body: JSON.stringify({ name: 'New Name' }),
      })
    );
  });

  it('updatePassword returns error on failure', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Incorrect password' }), { status: 401 }));
    const result = await updatePassword({ currentPassword: 'old', newPassword: 'new12345', confirmPassword: 'new12345' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Incorrect password');
  });

  it('fetchCurrentUser returns null when request fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 500 }));
    const user = await fetchCurrentUser();
    expect(user).toBeNull();
  });

  it('fetchSettings returns server settings', async () => {
    const settings = { openaiApiKey: 'sk-openai', doubaoApiKey: '', minimaxApiKey: '', llmProvider: 'deepseek', llmApiKey: 'sk-llm', llmApiKeys: { deepseek: 'sk-llm' }, llmBaseUrl: 'https://api.deepseek.com/v1', llmModel: 'deepseek-v4-pro' };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(settings), { status: 200 }));
    const result = await fetchSettings();
    expect(result).toEqual(settings);
  });

  it('updateSettings sends PATCH and returns updated data', async () => {
    const updated = { openaiApiKey: 'sk-new', doubaoApiKey: '', minimaxApiKey: '', llmProvider: 'deepseek', llmApiKey: '', llmApiKeys: {}, llmBaseUrl: '', llmModel: '' };
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(updated), { status: 200 }));
    const result = await updateSettings({ openaiApiKey: 'sk-new' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/settings'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ openaiApiKey: 'sk-new' }),
      })
    );
  });

  it('updateSettings sends per-provider llmApiKeys', async () => {
    const updated = { openaiApiKey: '', doubaoApiKey: '', minimaxApiKey: '', llmProvider: 'deepseek', llmApiKey: 'sk-deepseek', llmApiKeys: { deepseek: 'sk-deepseek' }, llmBaseUrl: '', llmModel: '' };
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(updated), { status: 200 }));
    const result = await updateSettings({ llmApiKeys: { deepseek: 'sk-deepseek' } });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/settings'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ llmApiKeys: { deepseek: 'sk-deepseek' } }),
      })
    );
  });
});
