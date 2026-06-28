import { describe, it, expect, beforeEach } from 'vitest';
import { getLLMSettings, setLLMSettings, setCapabilityConfig, getMediaCapabilityConfig } from './llmSettings';
import { LLM_PROVIDER_REGISTRY, defaultModelConfig } from '@shared/lib/providers';

const SETTINGS_KEY = 'spellpaw_llm_settings';

describe('llmSettings — Phase 4 capability-grouped', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when nothing is stored', () => {
    const got = getLLMSettings();
    expect(got.text.provider).toBe(defaultModelConfig('text').provider);
    expect(got.text.baseUrl).toBe(defaultModelConfig('text').baseUrl);
    expect(got.text.model).toBe(defaultModelConfig('text').model);
    expect(got.text.apiKey).toBe('');
    expect(got.image.provider).toBe(defaultModelConfig('image').provider);
    expect(got.video.provider).toBe(defaultModelConfig('video').provider);
  });

  it('round-trips per-capability configs', () => {
    setLLMSettings({
      text: { provider: 'deepseek', apiKey: 'sk-text', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-v4-pro' },
      image: { provider: 'doubao', apiKey: 'ark-img', baseUrl: LLM_PROVIDER_REGISTRY.doubao.baseUrl, model: 'doubao-seedream-5-0-lite' },
    });
    const got = getLLMSettings();
    expect(got.text.apiKey).toBe('sk-text');
    expect(got.text.model).toBe('deepseek-v4-pro');
    expect(got.image.apiKey).toBe('ark-img');
    expect(got.video.provider).toBe(defaultModelConfig('video').provider);
    expect(got.video.apiKey).toBe('');
  });

  it('merges partial updates without overwriting other capabilities', () => {
    setLLMSettings({
      text: { provider: 'deepseek', apiKey: 'sk-1', baseUrl: 'u1', model: 'm1' },
      image: { provider: 'doubao', apiKey: 'sk-2', baseUrl: 'u2', model: 'm2' },
    });
    setLLMSettings({
      video: { provider: 'minimax', apiKey: 'sk-3', baseUrl: 'u3', model: 'm3' },
    });
    const got = getLLMSettings();
    expect(got.text.apiKey).toBe('sk-1');
    expect(got.image.apiKey).toBe('sk-2');
    expect(got.video.apiKey).toBe('sk-3');
  });

  it('migrates legacy single-provider shape into text capability', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      provider: 'openai',
      apiKey: 'sk-legacy',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
    }));
    const got = getLLMSettings();
    expect(got.text.provider).toBe('openai');
    expect(got.text.apiKey).toBe('sk-legacy');
    expect(got.text.baseUrl).toBe('https://api.openai.com/v1');
    expect(got.text.model).toBe('gpt-4o');
  });

  it('migrates legacy apiKeys map into text capability', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      provider: 'deepseek',
      apiKeys: { deepseek: 'sk-deepseek' },
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-v4-pro',
    }));
    const got = getLLMSettings();
    expect(got.text.provider).toBe('deepseek');
    expect(got.text.apiKey).toBe('sk-deepseek');
  });

  it('uses drama doubaoApiKey for image and video when available', () => {
    const got = getLLMSettings({ doubao: 'ark-key' });
    expect(got.image.provider).toBe('doubao');
    expect(got.image.apiKey).toBe('ark-key');
    expect(got.video.provider).toBe('doubao');
    expect(got.video.apiKey).toBe('ark-key');
  });

  it('falls back to openai for image and minimax for video when no doubao key', () => {
    const got = getLLMSettings({ openai: 'sk-openai', minimax: 'eyJ-mini' });
    expect(got.image.provider).toBe('openai');
    expect(got.image.apiKey).toBe('sk-openai');
    expect(got.video.provider).toBe('minimax');
    expect(got.video.apiKey).toBe('eyJ-mini');
  });

  it('falls back to defaults for malformed stored data', () => {
    localStorage.setItem(SETTINGS_KEY, 'not-json');
    const got = getLLMSettings();
    expect(got.text.provider).toBe(defaultModelConfig('text').provider);
    expect(got.text.apiKey).toBe('');
  });

  it('ignores invalid provider on read', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      text: { provider: 'spellpaw' as unknown as 'deepseek', apiKey: 'k', baseUrl: 'u', model: 'm' },
    }));
    const got = getLLMSettings();
    expect(got.text.provider).toBe(defaultModelConfig('text').provider);
  });

  it('setCapabilityConfig updates just one capability', () => {
    setCapabilityConfig('text', { provider: 'openai', apiKey: 'sk-x', baseUrl: 'https://api.openai.com/v1', model: 'gpt-5.5' });
    const got = getMediaCapabilityConfig('text');
    expect(got.provider).toBe('openai');
    expect(got.apiKey).toBe('sk-x');
  });
});