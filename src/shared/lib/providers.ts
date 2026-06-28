/**
 * LLM provider registry — single source of truth for provider metadata
 * shared between the console Integrations page and the drama-side
 * canvas-toolkit provider plugins.
 *
 * Phase 4: every provider declares which capabilities it supports
 * (text / image / video) and the recommended model per capability.
 * The legacy MULTIMODAL_PROVIDERS map is gone — provider selection is
 * always capability-scoped now.
 */

export const LLM_PROVIDERS = ['doubao', 'minimax', 'deepseek', 'openai', 'siliconflow'] as const;
export type LLMProviderType = (typeof LLM_PROVIDERS)[number];

/** Media-level capability bucket used by LLM_PROVIDER_REGISTRY. Coarser
 *  than the drama canvas toolkit's Capability union (which is per-intent:
 *  text2image / image2image / …). To translate between the two, see
 *  CAPABILITY_TO_MEDIA in console/IntegrationsSection. */
export type Capability = 'text' | 'image' | 'video' | 'audio' | 'model3d';

export interface LLMProviderConfig {
  baseUrl: string;
  /** Default text model — kept for back-compat with the old single-provider API. */
  model: string;
  apiKeyPlaceholder: string;
  /** Recommended / selectable text model IDs. */
  models?: string[];
  /** Which capabilities this provider supports. */
  capabilities: Capability[];
  /** Recommended model per capability. Used as the default when a user
   *  picks this provider for a given capability. */
  recommended: Partial<Record<Capability, string>>;
}

export const LLM_PROVIDER_REGISTRY: Record<LLMProviderType, LLMProviderConfig> = {
  doubao: {
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-seed-2-0-pro',
    apiKeyPlaceholder: 'ark-...',
    models: [
      'doubao-seed-2-0-pro',
      'doubao-seed-2-0-lite',
      'doubao-seed-2-0-mini',
      'doubao-seed-2-0-code',
    ],
    capabilities: ['text', 'image', 'video'],
    recommended: {
      text: 'doubao-seed-2-0-pro',
      image: 'doubao-seedream-5-0-lite',
      video: 'doubao-seedance-2-5',
    },
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-5.5',
    apiKeyPlaceholder: 'sk-...',
    models: ['gpt-5.5', 'gpt-5.5-pro', 'gpt-5.5-instant'],
    capabilities: ['text', 'image', 'audio'],
    recommended: {
      text: 'gpt-5.5',
      image: 'gpt-image-2',
      audio: 'tts-1',
    },
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-v4-flash',
    apiKeyPlaceholder: 'sk-...',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    capabilities: ['text'],
    recommended: {
      text: 'deepseek-v4-flash',
    },
  },
  minimax: {
    baseUrl: 'https://api.minimax.chat/v1',
    model: 'MiniMax-M3',
    apiKeyPlaceholder: 'eyJ...',
    models: ['MiniMax-M3', 'MiniMax-M2.7-highspeed', 'MiniMax-M2.5'],
    capabilities: ['text', 'video'],
    recommended: {
      text: 'MiniMax-M3',
      video: 'MiniMax-Video-01',
    },
  },
  siliconflow: {
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'black-forest-labs/FLUX.2-pro',
    apiKeyPlaceholder: 'sk-...',
    models: ['black-forest-labs/FLUX.2-pro', 'Qwen/Qwen-Image-Edit-2509'],
    capabilities: ['image'],
    recommended: {
      image: 'black-forest-labs/FLUX.2-pro',
    },
  },
};

export const DEFAULT_LLM_PROVIDER: LLMProviderType = 'deepseek';

export function isValidLLMProvider(value: unknown): value is LLMProviderType {
  return typeof value === 'string' && (LLM_PROVIDERS as readonly string[]).includes(value);
}

/**
 * Providers that support a given capability. Used to render the provider
 * pill row inside each `CapabilitySection`.
 */
export function providersForCapability(capability: Capability): LLMProviderType[] {
  return LLM_PROVIDERS.filter((p) =>
    LLM_PROVIDER_REGISTRY[p].capabilities.includes(capability),
  );
}

/**
 * Default ModelConfig for a capability — used as the seed when the user
 * has never configured this capability before. Provider is chosen by a
 * simple capability→provider heuristic; the user can swap afterwards.
 */
export const DEFAULT_PROVIDER_BY_CAPABILITY: Record<Capability, LLMProviderType> = {
  text: 'deepseek',
  image: 'doubao',
  video: 'doubao',
  audio: 'openai',
  model3d: 'doubao',
};

export function defaultModelConfig(capability: Capability): {
  provider: LLMProviderType;
  baseUrl: string;
  model: string;
} {
  const provider = DEFAULT_PROVIDER_BY_CAPABILITY[capability];
  const cfg = LLM_PROVIDER_REGISTRY[provider];
  return {
    provider,
    baseUrl: cfg.baseUrl,
    model: cfg.recommended[capability] ?? cfg.model,
  };
}