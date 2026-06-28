/**
 * Console ↔ Server API for user settings.
 *
 * Settings shape (Phase 4 final):
 *   - llmConfigs: keyed by Capability (text2image, image2image, inpaint,
 *     text2video, image2video, styleTransfer, text2audio, text2model,
 *     image2model). Each capability has its own provider + apiKey +
 *     baseUrl + model, fully independent.
 *   - No more per-provider keys (openaiApiKey/doubaoApiKey/minimaxApiKey) —
 *     drama reads exclusively from llmConfigs via capabilityConfig.ts.
 *
 * The shared `Capability` union (shared/lib/providers.ts) is the source
 * of truth for the keys here; if a new capability is added there, it
 * automatically flows through.
 */

import { authApi } from '@/shared/stores/authStore';
import type { ProfileFormData, PasswordFormData } from '@console/types';
import type { Capability, LLMProviderType } from '@shared/lib/providers';

export type { Capability };

/** Capability keys the user can configure in Console Integrations.
 *
 * Includes the Copilot chat LLM (`chat`) plus the 9-fine media-generation
 * keys consumed by the drama canvas toolkit. Backed by the same JSON
 * column on `User.llmConfigs`. */
export type ConfigCapability = 'chat' | Capability;

export interface ModelConfig {
  provider: LLMProviderType;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export type LlmConfigs = Partial<Record<ConfigCapability, ModelConfig>>;

export interface UserSettings {
  /** Per-capability LLM configs (sole LLM config surface). */
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