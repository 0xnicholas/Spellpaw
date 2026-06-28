import { describe, it, expect, beforeEach } from 'vitest';
import { getLLMSettings, setLLMSettings, setCapabilityConfig, getCapabilityConfigByKey } from './llmSettings';
import { LLM_PROVIDER_REGISTRY, defaultModelConfig, CAPABILITY_TO_MEDIA } from '@shared/lib/providers';

const SETTINGS_KEY = 'spellpaw_llm_settings';

describe('llmSettings — Phase 4 capability-grouped (chat + 9-fine media)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when nothing is stored (chat + every 9-fine media key)', () => {
    const got = getLLMSettings();
    // chat
    expect(got.chat?.provider).toBe(defaultModelConfig('text').provider);
    expect(got.chat?.apiKey).toBe('');
    // 9-fine media — derived default via CAPABILITY_TO_MEDIA
    expect(got.text2image?.provider).toBe(defaultModelConfig(CAPABILITY_TO_MEDIA.text2image).provider);
    expect(got.image2image?.provider).toBe(defaultModelConfig(CAPABILITY_TO_MEDIA.image2image).provider);
    expect(got.inpaint?.provider).toBe(defaultModelConfig(CAPABILITY_TO_MEDIA.inpaint).provider);
    expect(got.text2video?.provider).toBe(defaultModelConfig(CAPABILITY_TO_MEDIA.text2video).provider);
    expect(got.image2video?.provider).toBe(defaultModelConfig(CAPABILITY_TO_MEDIA.image2video).provider);
    expect(got.styleTransfer?.provider).toBe(defaultModelConfig(CAPABILITY_TO_MEDIA.styleTransfer).provider);
    expect(got.text2audio?.provider).toBe(defaultModelConfig(CAPABILITY_TO_MEDIA.text2audio).provider);
    expect(got.text2model?.provider).toBe(defaultModelConfig(CAPABILITY_TO_MEDIA.text2model).provider);
    expect(got.image2model?.provider).toBe(defaultModelConfig(CAPABILITY_TO_MEDIA.image2model).provider);
  });

  it('round-trips chat and 9-fine media configs', () => {
    setLLMSettings({
      chat: { provider: 'deepseek', apiKey: 'sk-chat', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-v4-pro' },
      text2image: { provider: 'doubao', apiKey: 'ark-t2i', baseUrl: LLM_PROVIDER_REGISTRY.doubao.baseUrl, model: 'doubao-seedream-5-0-lite' },
      text2video: { provider: 'doubao', apiKey: 'ark-t2v', baseUrl: LLM_PROVIDER_REGISTRY.doubao.baseUrl, model: 'doubao-seedance-2-5' },
    });
    const got = getLLMSettings();
    expect(got.chat?.apiKey).toBe('sk-chat');
    expect(got.chat?.model).toBe('deepseek-v4-pro');
    expect(got.text2image?.apiKey).toBe('ark-t2i');
    expect(got.text2video?.apiKey).toBe('ark-t2v');
    // untouched keys remain at defaults
    expect(got.image2image?.apiKey).toBe('');
  });

  it('merges partial updates without overwriting other keys', () => {
    setLLMSettings({
      chat: { provider: 'deepseek', apiKey: 'sk-1', baseUrl: 'u1', model: 'm1' },
      text2image: { provider: 'doubao', apiKey: 'sk-2', baseUrl: 'u2', model: 'm2' },
    });
    setLLMSettings({
      text2video: { provider: 'minimax', apiKey: 'sk-3', baseUrl: 'u3', model: 'm3' },
    });
    const got = getLLMSettings();
    expect(got.chat?.apiKey).toBe('sk-1');
    expect(got.text2image?.apiKey).toBe('sk-2');
    expect(got.text2video?.apiKey).toBe('sk-3');
  });

  it('migrates legacy single-provider shape into chat slot', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      provider: 'openai',
      apiKey: 'sk-legacy',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
    }));
    const got = getLLMSettings();
    expect(got.chat?.provider).toBe('openai');
    expect(got.chat?.apiKey).toBe('sk-legacy');
    expect(got.chat?.baseUrl).toBe('https://api.openai.com/v1');
    expect(got.chat?.model).toBe('gpt-4o');
  });

  it('migrates legacy apiKeys map into chat slot', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      provider: 'deepseek',
      apiKeys: { deepseek: 'sk-deepseek' },
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-v4-pro',
    }));
    const got = getLLMSettings();
    expect(got.chat?.provider).toBe('deepseek');
    expect(got.chat?.apiKey).toBe('sk-deepseek');
  });

  it('uses drama doubaoApiKey for text2image and text2video when available', () => {
    const got = getLLMSettings({ doubao: 'ark-key' });
    expect(got.text2image?.provider).toBe('doubao');
    expect(got.text2image?.apiKey).toBe('ark-key');
    expect(got.text2video?.provider).toBe('doubao');
    expect(got.text2video?.apiKey).toBe('ark-key');
  });

  it('falls back to openai for image2image and minimax for image2video when no doubao key', () => {
    const got = getLLMSettings({ openai: 'sk-openai', minimax: 'eyJ-mini' });
    expect(got.image2image?.provider).toBe('openai');
    expect(got.image2image?.apiKey).toBe('sk-openai');
    expect(got.image2video?.provider).toBe('minimax');
    expect(got.image2video?.apiKey).toBe('eyJ-mini');
  });

  it('falls back to defaults for malformed stored data', () => {
    localStorage.setItem(SETTINGS_KEY, 'not-json');
    const got = getLLMSettings();
    expect(got.chat?.provider).toBe(defaultModelConfig('text').provider);
    expect(got.chat?.apiKey).toBe('');
  });

  it('ignores invalid provider on read', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      chat: { provider: 'spellpaw' as unknown as 'deepseek', apiKey: 'k', baseUrl: 'u', model: 'm' },
    }));
    const got = getLLMSettings();
    expect(got.chat?.provider).toBe(defaultModelConfig('text').provider);
  });

  it('setCapabilityConfig updates just one key', () => {
    setCapabilityConfig('chat', { provider: 'openai', apiKey: 'sk-x', baseUrl: 'https://api.openai.com/v1', model: 'gpt-5.5' });
    const got = getCapabilityConfigByKey('chat');
    expect(got?.provider).toBe('openai');
    expect(got?.apiKey).toBe('sk-x');
  });
});
