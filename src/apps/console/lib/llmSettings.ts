export const LLM_PROVIDERS = ['doubao', 'minimax', 'deepseek', 'openai'] as const;

export type LLMProviderType = (typeof LLM_PROVIDERS)[number];

export interface LLMSettings {
  provider: LLMProviderType;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export const LLM_PROVIDER_DEFAULTS: Record<LLMProviderType, { baseUrl: string; model: string; apiKeyPlaceholder: string }> = {
  doubao: {
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-pro-32k',
    apiKeyPlaceholder: 'ark-...',
  },
  minimax: {
    baseUrl: 'https://api.minimax.chat/v1',
    model: 'abab6.5s-chat',
    apiKeyPlaceholder: 'eyJ...',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    apiKeyPlaceholder: 'sk-...',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    apiKeyPlaceholder: 'sk-...',
  },
};

export const DEFAULT_PROVIDER: LLMProviderType = 'deepseek';
const SETTINGS_KEY = 'spellpaw_llm_settings';

export function isValidProvider(value: unknown): value is LLMProviderType {
  return typeof value === 'string' && (LLM_PROVIDERS as readonly string[]).includes(value);
}

export function getLLMSettings(): LLMSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        provider: isValidProvider(parsed.provider) ? parsed.provider : DEFAULT_PROVIDER,
        apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
        baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
        model: typeof parsed.model === 'string' ? parsed.model : '',
      };
    }
  } catch { /* ignore */ }
  const defaults = LLM_PROVIDER_DEFAULTS[DEFAULT_PROVIDER];
  return { provider: DEFAULT_PROVIDER, apiKey: '', baseUrl: defaults.baseUrl, model: defaults.model };
}

export function setLLMSettings(settings: LLMSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
