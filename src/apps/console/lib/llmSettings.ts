/**
 * Console-side LLM settings (Phase 4: capability-grouped).
 *
 * `spellpaw_llm_settings` localStorage entry stores one ModelConfig
 * per capability (text / image / video). Each capability has its own
 * provider + apiKey + baseUrl + model — keys are NOT shared across
 * capabilities, even for the same provider.
 *
 * Migration:
 *   Legacy `{ provider, apiKey, apiKeys, baseUrl, model }` shape is
 *   translated to per-capability defaults on read:
 *     text  ← legacy provider / apiKey / apiKeys[provider] / baseUrl / model
 *     image ← drama doubaoApiKey (or openai / default)
 *     video ← drama doubaoApiKey (or minimax / default)
 *   New writes always use the new shape.
 */

import {
  defaultModelConfig,
  isValidLLMProvider,
  LLM_PROVIDER_REGISTRY,
  type MediaCapability,
} from '@shared/lib/providers';
import type { ModelConfig as ServerModelConfig } from './consoleApi';

export type ModelConfig = ServerModelConfig;
export type LlmConfigs = Record<MediaCapability, ModelConfig>;

const SETTINGS_KEY = 'spellpaw_llm_settings';

export interface DramaApiKeys {
  doubao?: string;
  openai?: string;
  minimax?: string;
}

function buildDefaultConfigs(drama: DramaApiKeys): LlmConfigs {
  const seed = (cap: MediaCapability): ModelConfig => ({
    ...defaultModelConfig(cap),
    apiKey: '',
  });
  const fresh: LlmConfigs = {
    text: seed('text'),
    image: seed('image'),
    video: seed('video'),
    audio: seed('audio'),
    model3d: seed('model3d'),
  };

  if (drama.doubao) {
    fresh.image.provider = 'doubao';
    fresh.image.apiKey = drama.doubao;
    const recommendedImage = LLM_PROVIDER_REGISTRY.doubao.recommended.image;
    if (recommendedImage) fresh.image.model = recommendedImage;

    fresh.video.provider = 'doubao';
    fresh.video.apiKey = drama.doubao;
    const recommendedVideo = LLM_PROVIDER_REGISTRY.doubao.recommended.video;
    if (recommendedVideo) fresh.video.model = recommendedVideo;
  } else {
    if (drama.openai) {
      fresh.image.provider = 'openai';
      fresh.image.apiKey = drama.openai;
      const recommended = LLM_PROVIDER_REGISTRY.openai.recommended.image;
      if (recommended) fresh.image.model = recommended;
    }
    if (drama.minimax) {
      fresh.video.provider = 'minimax';
      fresh.video.apiKey = drama.minimax;
      const recommended = LLM_PROVIDER_REGISTRY.minimax.recommended.video;
      if (recommended) fresh.video.model = recommended;
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
    ('text' in parsed || 'image' in parsed || 'video' in parsed) &&
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
    // Legacy shape → derive text from old fields, image/video from drama keys.
    const legacy = parsed as LegacyShape;
    const textProvider = isValidLLMProvider(legacy.provider) ? legacy.provider : 'deepseek';
    const textCfg = LLM_PROVIDER_REGISTRY[textProvider];
    const legacyApiKeys = legacy.apiKeys ?? {};
    const textApiKey =
      (typeof legacyApiKeys[textProvider] === 'string' ? legacyApiKeys[textProvider] : '') ||
      (typeof legacy.apiKey === 'string' ? legacy.apiKey : '');
    fresh.text = {
      provider: textProvider,
      apiKey: textApiKey,
      baseUrl: typeof legacy.baseUrl === 'string' && legacy.baseUrl ? legacy.baseUrl : textCfg.baseUrl,
      model: typeof legacy.model === 'string' && legacy.model ? legacy.model : textCfg.model,
    };
    // image/video come from drama keys via buildDefaultConfigs (called above).
    return fresh;
  }

  // New shape → merge each capability that exists.
  for (const cap of ['text', 'image', 'video', 'audio', 'model3d'] as MediaCapability[]) {
    const incoming = parsed[cap];
    if (incoming) {
      fresh[cap] = coerceConfig(incoming, fresh[cap]);
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

export function setCapabilityConfig(capability: MediaCapability, config: ModelConfig): void {
  setLLMSettings({ [capability]: config });
}

export function getMediaCapabilityConfig(capability: MediaCapability): ModelConfig {
  return getLLMSettings()[capability];
}