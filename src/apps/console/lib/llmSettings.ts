import {
  LLM_PROVIDERS,
  LLM_PROVIDER_REGISTRY,
  DEFAULT_LLM_PROVIDER,
  isValidLLMProvider,
  type LLMProviderType,
} from '@shared/lib/providers';

export type { LLMProviderType };
export { LLM_PROVIDERS, DEFAULT_LLM_PROVIDER };
export { LLM_PROVIDER_REGISTRY as LLM_PROVIDER_DEFAULTS };
export { DEFAULT_LLM_PROVIDER as DEFAULT_PROVIDER };
export { isValidLLMProvider as isValidProvider };

export interface LLMSettings {
  provider: LLMProviderType;
  apiKey: string;
  baseUrl: string;
  model: string;
}

const SETTINGS_KEY = 'spellpaw_llm_settings';

export function getLLMSettings(): LLMSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        provider: isValidLLMProvider(parsed.provider) ? parsed.provider : DEFAULT_LLM_PROVIDER,
        apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
        baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
        model: typeof parsed.model === 'string' ? parsed.model : '',
      };
    }
  } catch { /* ignore */ }
  const defaults = LLM_PROVIDER_REGISTRY[DEFAULT_LLM_PROVIDER];
  return { provider: DEFAULT_LLM_PROVIDER, apiKey: '', baseUrl: defaults.baseUrl, model: defaults.model };
}

export function setLLMSettings(settings: LLMSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
