export const LLM_PROVIDERS = ['doubao', 'minimax', 'deepseek', 'openai'] as const;
export type LLMProviderType = (typeof LLM_PROVIDERS)[number];

export interface LLMProviderConfig {
  baseUrl: string;
  model: string;
  apiKeyPlaceholder: string;
  /** Recommended / selectable model IDs for this provider. */
  models?: string[];
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
      'doubao-1-5-pro-32k',
      'doubao-1-5-lite-32k',
    ],
  },
  minimax: {
    baseUrl: 'https://api.minimax.chat/v1',
    model: 'MiniMax-Text-01',
    apiKeyPlaceholder: 'eyJ...',
    models: ['MiniMax-Text-01', 'MiniMax-M1', 'abab6.5s-chat'],
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-v4-flash',
    apiKeyPlaceholder: 'sk-...',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-5.4-mini',
    apiKeyPlaceholder: 'sk-...',
    models: ['gpt-5.4-mini', 'gpt-5.4', 'gpt-5.5', 'gpt-4o-mini'],
  },
};

export const DEFAULT_LLM_PROVIDER: LLMProviderType = 'deepseek';

export function isValidLLMProvider(value: unknown): value is LLMProviderType {
  return typeof value === 'string' && (LLM_PROVIDERS as readonly string[]).includes(value);
}

export const MULTIMODAL_PROVIDERS = ['openai', 'doubao', 'minimax'] as const;
export type MultimodalProviderType = (typeof MULTIMODAL_PROVIDERS)[number];

export interface MultimodalProviderConfig {
  labelKey: string;
  hintKey: string;
  placeholderKey?: string;
}

export const MULTIMODAL_PROVIDER_REGISTRY: Record<MultimodalProviderType, MultimodalProviderConfig> = {
  openai: {
    labelKey: 'console.integrations.openaiKey',
    hintKey: 'console.integrations.openaiHint',
    placeholderKey: 'console.integrations.openaiPlaceholder',
  },
  doubao: {
    labelKey: 'console.integrations.doubaoKey',
    hintKey: 'console.integrations.doubaoHint',
    placeholderKey: 'console.integrations.doubaoPlaceholder',
  },
  minimax: {
    labelKey: 'console.integrations.minimaxKey',
    hintKey: 'console.integrations.minimaxHint',
    placeholderKey: 'console.integrations.minimaxPlaceholder',
  },
};
