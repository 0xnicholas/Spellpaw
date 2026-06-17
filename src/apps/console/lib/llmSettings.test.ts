import { describe, it, expect, beforeEach } from 'vitest';
import { getLLMSettings, setLLMSettings, LLM_PROVIDER_DEFAULTS } from './llmSettings';

const SETTINGS_KEY = 'spellpaw_llm_settings';

describe('llmSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when nothing is stored', () => {
    expect(getLLMSettings()).toEqual({
      provider: 'deepseek',
      apiKey: '',
      baseUrl: LLM_PROVIDER_DEFAULTS.deepseek.baseUrl,
      model: LLM_PROVIDER_DEFAULTS.deepseek.model,
    });
  });

  it('round-trips deepseek settings', () => {
    const settings = {
      provider: 'deepseek' as const,
      apiKey: 'sk-test',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
    };
    setLLMSettings(settings);
    expect(getLLMSettings()).toEqual(settings);
  });

  it('round-trips openai settings', () => {
    const settings = {
      provider: 'openai' as const,
      apiKey: 'sk-openai',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
    };
    setLLMSettings(settings);
    expect(getLLMSettings()).toEqual(settings);
  });

  it('falls back to defaults for invalid stored provider', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ provider: 'spellpaw', apiKey: 'x', baseUrl: 'y', model: 'z' }));
    expect(getLLMSettings()).toEqual({
      provider: 'deepseek',
      apiKey: 'x',
      baseUrl: 'y',
      model: 'z',
    });
  });

  it('falls back to defaults for malformed stored data', () => {
    localStorage.setItem(SETTINGS_KEY, 'not-json');
    expect(getLLMSettings()).toEqual({
      provider: 'deepseek',
      apiKey: '',
      baseUrl: LLM_PROVIDER_DEFAULTS.deepseek.baseUrl,
      model: LLM_PROVIDER_DEFAULTS.deepseek.model,
    });
  });
});
