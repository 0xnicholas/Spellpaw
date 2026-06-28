import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LLM_PROVIDERS,
  LLM_PROVIDER_DEFAULTS,
  DEFAULT_LLM_PROVIDER,
  isSupportedLLMProvider,
  defaultProviderFor,
  DEFAULT_PROVIDER_BY_CAPABILITY,
  type Capability,
} from './providers.js';

describe('server providers (Phase 4 capability-grouped)', () => {
  it('lists expected providers including siliconflow', () => {
    expect(SUPPORTED_LLM_PROVIDERS).toEqual(['doubao', 'minimax', 'deepseek', 'openai', 'siliconflow']);
  });

  it('has defaults with capabilities + recommended for every provider', () => {
    for (const p of SUPPORTED_LLM_PROVIDERS) {
      const defaults = LLM_PROVIDER_DEFAULTS[p];
      expect(defaults).toBeDefined();
      expect(defaults.baseUrl).toMatch(/^https?:\/\//);
      expect(defaults.model).toBeTruthy();
      expect(Array.isArray(defaults.capabilities)).toBe(true);
      expect(defaults.capabilities.length).toBeGreaterThan(0);
      for (const cap of defaults.capabilities) {
        expect(defaults.recommended[cap]).toBeTruthy();
      }
    }
  });

  it('siliconflow is image-only', () => {
    expect(LLM_PROVIDER_DEFAULTS.siliconflow.capabilities).toEqual(['image']);
  });

  it('default provider is supported', () => {
    expect(isSupportedLLMProvider(DEFAULT_LLM_PROVIDER)).toBe(true);
  });

  it('validates provider names', () => {
    expect(isSupportedLLMProvider('deepseek')).toBe(true);
    expect(isSupportedLLMProvider('siliconflow')).toBe(true);
    expect(isSupportedLLMProvider('gemini')).toBe(false);
    expect(isSupportedLLMProvider(undefined)).toBe(false);
    expect(isSupportedLLMProvider(42)).toBe(false);
  });

  it('defaultProviderFor maps capabilities to sensible providers', () => {
    expect(defaultProviderFor('text')).toBe('deepseek');
    expect(defaultProviderFor('image')).toBe('doubao');
    expect(defaultProviderFor('video')).toBe('doubao');
    // Cross-check
    for (const cap of ['text', 'image', 'video'] as Capability[]) {
      expect(defaultProviderFor(cap)).toBe(DEFAULT_PROVIDER_BY_CAPABILITY[cap]);
    }
  });
});