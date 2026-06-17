import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LLM_PROVIDERS,
  LLM_PROVIDER_DEFAULTS,
  DEFAULT_LLM_PROVIDER,
  isSupportedLLMProvider,
} from './providers';

describe('server providers', () => {
  it('lists expected providers', () => {
    expect(SUPPORTED_LLM_PROVIDERS).toEqual(['doubao', 'minimax', 'deepseek', 'openai']);
  });

  it('has defaults for every provider', () => {
    for (const p of SUPPORTED_LLM_PROVIDERS) {
      const defaults = LLM_PROVIDER_DEFAULTS[p];
      expect(defaults).toBeDefined();
      expect(defaults.baseUrl).toMatch(/^https?:\/\//);
      expect(defaults.model).toBeTruthy();
    }
  });

  it('default provider is supported', () => {
    expect(isSupportedLLMProvider(DEFAULT_LLM_PROVIDER)).toBe(true);
  });

  it('validates provider names', () => {
    expect(isSupportedLLMProvider('deepseek')).toBe(true);
    expect(isSupportedLLMProvider('openai')).toBe(true);
    expect(isSupportedLLMProvider('gemini')).toBe(false);
    expect(isSupportedLLMProvider(undefined)).toBe(false);
    expect(isSupportedLLMProvider(42)).toBe(false);
  });
});
