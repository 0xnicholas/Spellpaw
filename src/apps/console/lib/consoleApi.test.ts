import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateProfile, updatePassword, fetchCurrentUser, fetchSettings, updateSettings, type UserSettings } from './consoleApi';
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
    const settings: UserSettings = {
      llmConfigs: {
        text2image: { provider: 'deepseek', apiKey: 'sk-llm', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-v4-pro' },
      },
    };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(settings), { status: 200 }));
    const result = await fetchSettings();
    expect(result).toEqual(settings);
  });

  it('updateSettings sends PATCH and returns updated data', async () => {
    const updated: UserSettings = {
      llmConfigs: { text2image: { provider: 'deepseek', apiKey: '', baseUrl: '', model: '' } },
    };
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(updated), { status: 200 }));
    const result = await updateSettings({ llmConfigs: { text2image: { provider: 'deepseek', apiKey: 'sk-new', baseUrl: 'u', model: 'm' } } });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/settings'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ llmConfigs: { text2image: { provider: 'deepseek', apiKey: 'sk-new', baseUrl: 'u', model: 'm' } } }),
      })
    );
  });

  it('updateSettings sends llmConfigs patch', async () => {
    const updated: UserSettings = {
      llmConfigs: {
        text2image: { provider: 'doubao', apiKey: 'ark-new', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-seedream-5-0-lite' },
      },
    };
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(updated), { status: 200 }));
    const result = await updateSettings({
      llmConfigs: {
        text2image: { provider: 'doubao', apiKey: 'ark-new', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-seedream-5-0-lite' },
      },
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/settings'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          llmConfigs: {
            text2image: { provider: 'doubao', apiKey: 'ark-new', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-seedream-5-0-lite' },
          },
        }),
      })
    );
  });
});