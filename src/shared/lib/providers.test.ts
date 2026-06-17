import { describe, it, expect } from 'vitest';
import {
  LLM_PROVIDERS,
  LLM_PROVIDER_REGISTRY,
  DEFAULT_LLM_PROVIDER,
  isValidLLMProvider,
  MULTIMODAL_PROVIDERS,
  MULTIMODAL_PROVIDER_REGISTRY,
} from './providers';

describe('providers', () => {
  it('lists expected LLM providers', () => {
    expect(LLM_PROVIDERS).toEqual(['doubao', 'minimax', 'deepseek', 'openai']);
  });

  it('has config for every LLM provider', () => {
    for (const p of LLM_PROVIDERS) {
      const config = LLM_PROVIDER_REGISTRY[p];
      expect(config).toBeDefined();
      expect(config.baseUrl).toMatch(/^https?:\/\//);
      expect(config.model).toBeTruthy();
      expect(config.apiKeyPlaceholder).toBeTruthy();
    }
  });

  it('default provider is supported', () => {
    expect(isValidLLMProvider(DEFAULT_LLM_PROVIDER)).toBe(true);
  });

  it('validates provider names', () => {
    expect(isValidLLMProvider('deepseek')).toBe(true);
    expect(isValidLLMProvider('openai')).toBe(true);
    expect(isValidLLMProvider('gemini')).toBe(false);
    expect(isValidLLMProvider(null)).toBe(false);
    expect(isValidLLMProvider(123)).toBe(false);
  });

  it('lists multimodal providers with required metadata', () => {
    expect(MULTIMODAL_PROVIDERS).toEqual(['openai', 'doubao', 'minimax']);
    for (const p of MULTIMODAL_PROVIDERS) {
      const config = MULTIMODAL_PROVIDER_REGISTRY[p];
      expect(config).toBeDefined();
      expect(config.labelKey).toBeTruthy();
      expect(config.hintKey).toBeTruthy();
    }
  });
});
