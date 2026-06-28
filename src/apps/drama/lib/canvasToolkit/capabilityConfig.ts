/**
 * Per-capability LLM config resolver for the drama canvas toolkit.
 *
 * Reads the capability-grouped LLM settings (synced from the server
 * by syncUserSettings) and returns the right ModelConfig for each
 * capability. Providers call this before each `submit` so that an `art`
 * card uses the image-configured provider/model and a `videoClip` card
 * uses the video-configured one.
 *
 * Source of truth:
 *   localStorage[`spellpaw_llm_settings`] — set by syncUserSettings
 *   Schema: { text?: ModelConfig, image?: ModelConfig, video?: ModelConfig }
 *
 * Legacy fallback:
 *   localStorage[`spellpaw_settings`].{doubao,openai,minimax}ApiKey
 *   These keys are still synced (drama canvas code used to read them
 *   directly). They keep working here as a backstop if llmConfigs is
 *   absent.
 */

import type { LLMProviderType } from '@shared/lib/providers';

export type MediaCapability = 'image' | 'video' | 'text';

export interface CapabilityModelConfig {
  provider: LLMProviderType | string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

const LLMS_KEY = 'spellpaw_llm_settings';
const LEGACY_KEY = 'spellpaw_settings';

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

interface LlmConfigsShape {
  text?: unknown;
  image?: unknown;
  video?: unknown;
}

/**
 * Returns the ModelConfig for one capability, or null if nothing usable
 * is configured (no provider selected, no apiKey).
 *
 * The legacy per-provider keys (spellpaw_settings.doubaoApiKey etc.)
 * are used as a backstop so older deployments keep working.
 */
export function getCapabilityConfig(capability: MediaCapability): CapabilityModelConfig | null {
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

  // Legacy fallback: spellpaw_settings.{provider}ApiKey
  const legacy = readJSON<Record<string, string>>(LEGACY_KEY);
  if (!legacy) return null;

  const legacyProvider = legacy[`${capability}Provider`] as string | undefined;
  const legacyKey =
    legacy[`${legacyProvider ?? ''}ApiKey`] ??
    (capability === 'image' ? legacy.openaiApiKey : undefined) ??
    legacy.doubaoApiKey ??
    legacy.minimaxApiKey;
  if (!legacyKey) return null;

  return {
    provider: legacyProvider ?? 'doubao',
    apiKey: legacyKey,
    baseUrl: '',
    model: '',
  };
}

/** Convenience: only the apiKey for a capability. */
export function getCapabilityApiKey(capability: MediaCapability): string | null {
  return getCapabilityConfig(capability)?.apiKey ?? null;
}
