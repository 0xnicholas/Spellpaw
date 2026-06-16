export type LLMProviderType = 'spellpaw' | 'custom';

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
        provider: parsed.provider === 'custom' ? 'custom' : 'spellpaw',
        apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
        baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
        model: typeof parsed.model === 'string' ? parsed.model : '',
      };
    }
  } catch { /* ignore */ }
  return { provider: 'spellpaw', apiKey: '', baseUrl: '', model: '' };
}

export function setLLMSettings(settings: LLMSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
