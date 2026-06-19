import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLLMSettings,
  setLLMSettings,
  getLLMProviderApiKey,
  setLLMProviderApiKey,
  LLM_PROVIDER_DEFAULTS,
} from './llmSettings';

const SETTINGS_KEY = 'spellpaw_llm_settings';

describe('llmSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when nothing is stored', () => {
    expect(getLLMSettings()).toEqual({
      provider: 'deepseek',
      apiKey: '',
      apiKeys: {},
      baseUrl: LLM_PROVIDER_DEFAULTS.deepseek.baseUrl,
      model: LLM_PROVIDER_DEFAULTS.deepseek.model,
    });
  });

  it('round-trips per-provider api keys', () => {
    const settings = {
      provider: 'deepseek' as const,
      apiKey: 'sk-deepseek',
      apiKeys: {
        deepseek: 'sk-deepseek',
        openai: 'sk-openai',
      },
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-v4-pro',
    };
    setLLMSettings(settings);
    expect(getLLMSettings()).toEqual({
      provider: 'deepseek',
      apiKey: 'sk-deepseek',
      apiKeys: {
        deepseek: 'sk-deepseek',
        openai: 'sk-openai',
      },
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-v4-pro',
    });
  });

  it('returns the api key for the active provider', () => {
    setLLMSettings({
      provider: 'deepseek',
      apiKey: 'sk-deepseek',
      apiKeys: { deepseek: 'sk-deepseek', openai: 'sk-openai' },
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-v4-pro',
    });
    expect(getLLMSettings().apiKey).toBe('sk-deepseek');
    expect(getLLMProviderApiKey('openai')).toBe('sk-openai');
    expect(getLLMProviderApiKey('doubao')).toBe('');
  });

  it('migrates legacy single apiKey format', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      provider: 'openai',
      apiKey: 'sk-legacy',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
    }));
    expect(getLLMSettings()).toEqual({
      provider: 'openai',
      apiKey: 'sk-legacy',
      apiKeys: { openai: 'sk-legacy' },
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
    });
  });

  it('removes key for current provider when apiKey is empty', () => {
    setLLMSettings({
      provider: 'deepseek',
      apiKey: 'sk-deepseek',
      apiKeys: { deepseek: 'sk-deepseek', openai: 'sk-openai' },
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-v4-pro',
    });
    setLLMSettings({
      provider: 'deepseek',
      apiKey: '',
      apiKeys: { deepseek: 'sk-deepseek', openai: 'sk-openai' },
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-v4-pro',
    });
    expect(getLLMSettings().apiKeys).toEqual({ openai: 'sk-openai' });
    expect(getLLMSettings().apiKey).toBe('');
  });

  it('falls back to defaults for invalid stored provider', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ provider: 'spellpaw', apiKeys: { deepseek: 'x' }, baseUrl: 'y', model: 'z' }));
    expect(getLLMSettings()).toEqual({
      provider: 'deepseek',
      apiKey: 'x',
      apiKeys: { deepseek: 'x' },
      baseUrl: 'y',
      model: 'z',
    });
  });

  it('falls back to defaults for malformed stored data', () => {
    localStorage.setItem(SETTINGS_KEY, 'not-json');
    expect(getLLMSettings()).toEqual({
      provider: 'deepseek',
      apiKey: '',
      apiKeys: {},
      baseUrl: LLM_PROVIDER_DEFAULTS.deepseek.baseUrl,
      model: LLM_PROVIDER_DEFAULTS.deepseek.model,
    });
  });

  it('setLLMProviderApiKey updates only the target provider', () => {
    setLLMSettings({
      provider: 'deepseek',
      apiKey: 'sk-deepseek',
      apiKeys: { deepseek: 'sk-deepseek' },
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-v4-pro',
    });
    setLLMProviderApiKey('openai', 'sk-openai');
    expect(getLLMProviderApiKey('openai')).toBe('sk-openai');
    expect(getLLMProviderApiKey('deepseek')).toBe('sk-deepseek');
  });
});
