/**
 * Per-capability LLM config resolver for the drama canvas toolkit.
 *
 * Reads the capability-grouped LLM settings (synced from the server
 * by syncUserSettings) and returns the right ModelConfig for each
 * Capability. Providers call this before each `submit` so that, e.g.,
 * a `text2image` call can use Doubao while an `image2image` call uses
 * SiliconFlow — independently configured per capability.
 *
 * Source of truth:
 *   localStorage[`spellpaw_llm_settings`] — set by syncUserSettings
 *   Schema: { [Capability]?: ModelConfig } where Capability is the drama
 *           canvas toolkit union (text2image, image2image, inpaint,
 *           text2video, image2video, styleTransfer).
 */

import type { LLMProviderType } from '@shared/lib/providers';
import type { Capability } from './types';

export interface CapabilityModelConfig {
  provider: LLMProviderType | string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

const LLMS_KEY = 'spellpaw_llm_settings';

function readJSON<T>(key: string): Partial<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<T>;
  } catch {
    return null;
  }
}

function coerce(raw: unknown, fallback: CapabilityModelConfig): CapabilityModelConfig {
  if (!raw || typeof raw !== 'object') return fallback;
  const r = raw as Record<string, unknown>;
  return {
    provider: typeof r.provider === 'string' ? r.provider : fallback.provider,
    apiKey: typeof r.apiKey === 'string' ? r.apiKey : fallback.apiKey,
    baseUrl: typeof r.baseUrl === 'string' && r.baseUrl ? r.baseUrl : fallback.baseUrl,
    model: typeof r.model === 'string' && r.model ? r.model : fallback.model,
  };
}

type LlmConfigsShape = Partial<Record<Capability, unknown>>;

/**
 * Returns the ModelConfig for one capability, or null if nothing usable
 * is configured (no provider selected, no apiKey).
 */
export function getCapabilityConfig(capability: Capability): CapabilityModelConfig | null {
  const all = readJSON<LlmConfigsShape>(LLMS_KEY);
  const direct = all?.[capability];
  if (direct && typeof direct === 'object') {
    const c = coerce(direct, {
      provider: 'deepseek',
      apiKey: '',
      baseUrl: '',
      model: '',
    });
    if (c.apiKey) return c;
  }
  return null;
}

/** Convenience: only the apiKey for a capability. */
export function getCapabilityApiKey(capability: Capability): string | null {
  return getCapabilityConfig(capability)?.apiKey ?? null;
}
