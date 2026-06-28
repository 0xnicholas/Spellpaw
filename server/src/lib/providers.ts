/**
 * Backend mirror of the frontend LLM provider registry.
 *
 * Kept in sync with src/shared/lib/providers.ts. Used by the server's
 * settings routes to validate provider names + capability defaults.
 */

export const SUPPORTED_LLM_PROVIDERS = [
  'doubao',
  'minimax',
  'deepseek',
  'openai',
  'siliconflow',
  'xiaomi-mimo',
] as const;
export type SupportedLLMProvider = (typeof SUPPORTED_LLM_PROVIDERS)[number];

export type Capability = 'text' | 'image' | 'video' | 'audio' | 'model3d';

export interface LLMProviderDefaults {
  baseUrl: string;
  /** Default text model. */
  model: string;
  /** Capabilities this provider supports. */
  capabilities: Capability[];
  /** Recommended model per capability. */
  recommended: Partial<Record<Capability, string>>;
}

export const LLM_PROVIDER_DEFAULTS: Record<SupportedLLMProvider, LLMProviderDefaults> = {
  doubao: {
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-seed-2-0-pro',
    capabilities: ['text', 'image', 'video'],
    recommended: {
      text: 'doubao-seed-2-0-pro',
      image: 'doubao-seedream-5-0-lite',
      video: 'doubao-seedance-2-5',
    },
  },
  minimax: {
    baseUrl: 'https://api.minimax.chat/v1',
    model: 'MiniMax-M3',
    capabilities: ['text', 'video'],
    recommended: {
      text: 'MiniMax-M3',
      video: 'MiniMax-Video-01',
    },
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-v4-flash',
    capabilities: ['text'],
    recommended: {
      text: 'deepseek-v4-flash',
    },
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-5.5',
    capabilities: ['text', 'image', 'audio'],
    recommended: {
      text: 'gpt-5.5',
      image: 'gpt-image-2',
      audio: 'tts-1',
    },
  },
  siliconflow: {
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'black-forest-labs/FLUX.2-pro',
    capabilities: ['image'],
    recommended: {
      image: 'black-forest-labs/FLUX.2-pro',
    },
  },
  'xiaomi-mimo': {
    baseUrl: 'https://api.mimo.xiaomi.com/v1',
    model: 'MiMo-V2.5-Pro',
    capabilities: ['text'],
    recommended: {
      text: 'MiMo-V2.5-Pro',
    },
  },
};

export const DEFAULT_LLM_PROVIDER: SupportedLLMProvider = 'xiaomi-mimo';

export function isSupportedLLMProvider(value: unknown): value is SupportedLLMProvider {
  return typeof value === 'string' && (SUPPORTED_LLM_PROVIDERS as readonly string[]).includes(value);
}

/**
 * Provider that ships default settings for a given capability. Mirrors
 * the frontend `defaultModelConfig` heuristic.
 */
export const DEFAULT_PROVIDER_BY_CAPABILITY: Record<Capability, SupportedLLMProvider> = {
  text: 'xiaomi-mimo',
  image: 'doubao',
  video: 'doubao',
  audio: 'openai',
  model3d: 'doubao',
};

export function defaultProviderFor(capability: Capability): SupportedLLMProvider {
  return DEFAULT_PROVIDER_BY_CAPABILITY[capability];
}