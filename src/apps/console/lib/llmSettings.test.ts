import { describe, it, expect, beforeEach } from 'vitest';
import { getLLMSettings, setLLMSettings } from './llmSettings';

const SETTINGS_KEY = 'spellpaw_llm_settings';

describe('llmSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when nothing is stored', () => {
    expect(getLLMSettings()).toEqual({ provider: 'spellpaw', apiKey: '', baseUrl: '', model: '' });
  });

  it('round-trips custom settings', () => {
    const settings = {
      provider: 'custom' as const,
      apiKey: 'sk-test',
      baseUrl: 'https://api.example.com/v1',
      model: 'gpt-4o',
    };
    setLLMSettings(settings);
    expect(getLLMSettings()).toEqual(settings);
  });

  it('falls back to defaults for invalid stored data', () => {
    localStorage.setItem(SETTINGS_KEY, 'not-json');
    expect(getLLMSettings()).toEqual({ provider: 'spellpaw', apiKey: '', baseUrl: '', model: '' });
  });
});
