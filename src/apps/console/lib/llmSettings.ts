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
  apiKeys: Record<string, string>;
  baseUrl: string;
  model: string;
}

const SETTINGS_KEY = 'spellpaw_llm_settings';

export function getLLMSettings(): LLMSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const provider = isValidLLMProvider(parsed.provider) ? parsed.provider : DEFAULT_LLM_PROVIDER;

      // New format: per-provider apiKeys map.
      if (parsed.apiKeys && typeof parsed.apiKeys === 'object' && !Array.isArray(parsed.apiKeys)) {
        return {
          provider,
          apiKeys: parsed.apiKeys as Record<string, string>,
          apiKey: String(parsed.apiKeys?.[provider] ?? ''),
          baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
          model: typeof parsed.model === 'string' ? parsed.model : '',
        };
      }

      // Legacy format: single apiKey string.
      const legacyKey = typeof parsed.apiKey === 'string' ? parsed.apiKey : '';
      return {
        provider,
        apiKeys: legacyKey ? { [provider]: legacyKey } : {},
        apiKey: legacyKey,
        baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
        model: typeof parsed.model === 'string' ? parsed.model : '',
      };
    }
  } catch { /* ignore */ }
  const defaults = LLM_PROVIDER_REGISTRY[DEFAULT_LLM_PROVIDER];
  return { provider: DEFAULT_LLM_PROVIDER, apiKey: '', apiKeys: {}, baseUrl: defaults.baseUrl, model: defaults.model };
}

export function setLLMSettings(settings: LLMSettings): void {
  const provider = isValidLLMProvider(settings.provider) ? settings.provider : DEFAULT_LLM_PROVIDER;
  const apiKey = settings.apiKey.trim();
  const apiKeys = { ...settings.apiKeys };
  if (apiKey) {
    apiKeys[provider] = apiKey;
  } else {
    delete apiKeys[provider];
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    provider,
    apiKeys,
    baseUrl: settings.baseUrl.trim() || LLM_PROVIDER_REGISTRY[provider].baseUrl,
    model: settings.model.trim() || LLM_PROVIDER_REGISTRY[provider].model,
  }));
}

export function setLLMProviderApiKey(provider: LLMProviderType, apiKey: string): void {
  const settings = getLLMSettings();
  settings.provider = provider;
  settings.apiKey = apiKey;
  setLLMSettings(settings);
}

export function getLLMProviderApiKey(provider?: LLMProviderType): string {
  const settings = getLLMSettings();
  const target = provider ?? settings.provider;
  return settings.apiKeys[target] ?? '';
}
