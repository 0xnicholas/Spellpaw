/**
 * Console-side LLM settings (Phase 4: capability-grouped).
 *
 * `spellpaw_llm_settings` localStorage entry stores one ModelConfig per
 * key the user can configure. Two namespaces share the same JSON column:
 *
 *   1. `chat`         — the LLM provider for Copilot chat (text completion,
 *                       tool calling, streaming). 5-bucket text in the
 *                       previous schema.
 *   2. 9-fine media — `text2image`, `image2image`, `inpaint`, `text2video`,
 *                       `image2video`, `styleTransfer`, `text2audio`,
 *                       `text2model`, `image2model`. Consumed by the drama
 *                       canvas toolkit's `capabilityConfig.ts`.
 *
 * Each key has its own provider + apiKey + baseUrl + model. Keys are NOT
 * shared across capabilities, even for the same provider.
 *
 * The shape mirrors the server's `User.llmConfigs` JSON column, so the
 * `syncUserSettings` round-trip is a structural copy (no lossy cast).
 *
 * Migration:
 *   Legacy `{ provider, apiKey, apiKeys, baseUrl, model }` shape is
 *   translated to the new `chat` slot on read. New writes always use
 *   the new shape.
 */

import {
  defaultModelConfig,
  isValidLLMProvider,
  LLM_PROVIDER_REGISTRY,
  CAPABILITY_TO_MEDIA,
  type Capability,
  type MediaCapability,
} from '@shared/lib/providers';
import type { ConfigCapability, ModelConfig as ServerModelConfig } from './consoleApi';

export type ModelConfig = ServerModelConfig;
export type LlmConfigs = Partial<Record<ConfigCapability, ModelConfig>>;

const SETTINGS_KEY = 'spellpaw_llm_settings';

export interface DramaApiKeys {
  doubao?: string;
  openai?: string;
  minimax?: string;
}

/** All known keys, in display order. */
const ALL_KEYS: ConfigCapability[] = [
  'chat',
  'text2image',
  'image2image',
  'inpaint',
  'text2video',
  'image2video',
  'styleTransfer',
  'text2audio',
  'text2model',
  'image2model',
];

function buildDefaultConfigs(drama: DramaApiKeys): LlmConfigs {
  // Default `chat` config — text-capability LLM (DeepSeek by default).
  const chatDefault = { ...defaultModelConfig('text' as MediaCapability), apiKey: '' };
  const fresh: LlmConfigs = { chat: chatDefault };

  for (const cap of ALL_KEYS) {
    if (cap === 'chat') continue;
    const mediaCap = CAPABILITY_TO_MEDIA[cap as Capability];
    fresh[cap] = { ...defaultModelConfig(mediaCap), apiKey: '' };
  }

  if (drama.doubao) {
    const img = fresh.text2image;
    if (img) {
      img.provider = 'doubao';
      img.apiKey = drama.doubao;
      const r = LLM_PROVIDER_REGISTRY.doubao.recommended.image;
      if (r) img.model = r;
    }
    const vid = fresh.text2video;
    if (vid) {
      vid.provider = 'doubao';
      vid.apiKey = drama.doubao;
      const r = LLM_PROVIDER_REGISTRY.doubao.recommended.video;
      if (r) vid.model = r;
    }
  } else {
    const i2i = fresh.image2image;
    if (i2i && drama.openai) {
      i2i.provider = 'openai';
      i2i.apiKey = drama.openai;
      const r = LLM_PROVIDER_REGISTRY.openai.recommended.image;
      if (r) i2i.model = r;
    }
    const i2v = fresh.image2video;
    if (i2v && drama.minimax) {
      i2v.provider = 'minimax';
      i2v.apiKey = drama.minimax;
      const r = LLM_PROVIDER_REGISTRY.minimax.recommended.video;
      if (r) i2v.model = r;
    }
  }

  return fresh;
}

function coerceConfig(raw: unknown, fallback: ModelConfig): ModelConfig {
  if (!raw || typeof raw !== 'object') return fallback;
  const r = raw as Record<string, unknown>;
  return {
    provider: typeof r.provider === 'string' && isValidLLMProvider(r.provider)
      ? r.provider
      : fallback.provider,
    apiKey: typeof r.apiKey === 'string' ? r.apiKey : '',
    baseUrl: typeof r.baseUrl === 'string' && r.baseUrl ? r.baseUrl : fallback.baseUrl,
    model: typeof r.model === 'string' && r.model ? r.model : fallback.model,
  };
}

interface LegacyShape {
  provider?: unknown;
  apiKey?: unknown;
  apiKeys?: Record<string, unknown> | null;
  baseUrl?: unknown;
  model?: unknown;
}

function isNewShape(parsed: unknown): parsed is Partial<LlmConfigs> {
  return (
    !!parsed &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    (
      'chat' in parsed ||
      'text2image' in parsed ||
      'image2image' in parsed ||
      'inpaint' in parsed ||
      'text2video' in parsed ||
      'image2video' in parsed ||
      'styleTransfer' in parsed ||
      'text2audio' in parsed ||
      'text2model' in parsed ||
      'image2model' in parsed
    ) &&
    !('provider' in parsed)
  );
}

export function getLLMSettings(drama: DramaApiKeys = {}): LlmConfigs {
  let parsed: unknown;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  const fresh = buildDefaultConfigs(drama);

  if (!parsed) return fresh;
  if (!isNewShape(parsed)) {
    // Legacy shape → derive `chat` from old fields, 9-fine media from drama keys.
    const legacy = parsed as LegacyShape;
    const chatProvider = isValidLLMProvider(legacy.provider) ? legacy.provider : 'deepseek';
    const chatCfg = LLM_PROVIDER_REGISTRY[chatProvider];
    const legacyApiKeys = legacy.apiKeys ?? {};
    const chatApiKey =
      (typeof legacyApiKeys[chatProvider] === 'string' ? legacyApiKeys[chatProvider] : '') ||
      (typeof legacy.apiKey === 'string' ? legacy.apiKey : '');
    fresh.chat = {
      provider: chatProvider,
      apiKey: chatApiKey,
      baseUrl: typeof legacy.baseUrl === 'string' && legacy.baseUrl ? legacy.baseUrl : chatCfg.baseUrl,
      model: typeof legacy.model === 'string' && legacy.model ? legacy.model : chatCfg.model,
    };
    return fresh;
  }

  // New shape → merge each known key that exists.
  const obj = parsed as Record<string, unknown>;
  for (const cap of ALL_KEYS) {
    const incoming = obj[cap];
    if (incoming && typeof incoming === 'object') {
      const fallback = fresh[cap] ?? { provider: 'deepseek', apiKey: '', baseUrl: '', model: '' };
      fresh[cap] = coerceConfig(incoming, fallback);
    }
  }
  return fresh;
}

export function setLLMSettings(configs: Partial<LlmConfigs>): void {
  let existing: Partial<LlmConfigs> = {};
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isNewShape(parsed)) existing = parsed;
    }
  } catch {
    /* ignore */
  }
  const merged: Partial<LlmConfigs> = { ...existing, ...configs };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
}

export function setCapabilityConfig(capability: ConfigCapability, config: ModelConfig): void {
  setLLMSettings({ [capability]: config });
}

export function getCapabilityConfigByKey(capability: ConfigCapability): ModelConfig | undefined {
  return getLLMSettings()[capability];
}
