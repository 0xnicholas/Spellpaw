/**
 * Console ↔ Server API for user settings.
 *
 * Settings shape (Phase 4: capability-grouped LLM configs):
 *   - 3 drama-app API keys (openai/doubao/minimax) — drama still reads these.
 *   - llmConfigs: { text, image, video } — each capability has its own
 *     provider + apiKey + baseUrl + model, fully independent.
 */

import { authApi } from '@/shared/stores/authStore';
import type { ProfileFormData, PasswordFormData } from '@console/types';

export interface ModelConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export type LlmConfigs = {
  text?: ModelConfig;
  image?: ModelConfig;
  video?: ModelConfig;
};

export interface UserSettings {
  /** Drama-app API keys (still consumed by canvasToolkit imageGen). */
  openaiApiKey: string;
  doubaoApiKey: string;
  minimaxApiKey: string;
  /** Capability-grouped LLM configs. */
  llmConfigs: LlmConfigs;
}

export async function fetchSettings(): Promise<UserSettings | null> {
  const res = await authApi.apiCall('/api/auth/settings');
  if (!res.ok) return null;
  return res.json();
}

export async function updateSettings(
  settings: Partial<UserSettings>,
): Promise<{ success: boolean; error?: string; data?: UserSettings }> {
  const res = await authApi.apiCall('/api/auth/settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || 'Settings update failed' };
  }
  const data = await res.json();
  return { success: true, data };
}

export async function updateProfile(data: ProfileFormData): Promise<{ success: boolean; error?: string }> {
  const res = await authApi.apiCall('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || 'Update failed' };
  }
  return { success: true };
}

export async function updatePassword(data: PasswordFormData): Promise<{ success: boolean; error?: string }> {
  const res = await authApi.apiCall('/api/auth/password', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || 'Password update failed' };
  }
  return { success: true };
}

export async function fetchCurrentUser(): Promise<{ id: string; name: string; email: string; avatar?: string } | null> {
  const res = await authApi.apiCall('/api/auth/me');
  if (!res.ok) return null;
  return res.json();
}