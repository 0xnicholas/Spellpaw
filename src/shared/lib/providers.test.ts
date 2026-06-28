import { describe, it, expect } from 'vitest';
import {
  LLM_PROVIDERS,
  LLM_PROVIDER_REGISTRY,
  DEFAULT_LLM_PROVIDER,
  isValidLLMProvider,
  providersForCapability,
  defaultModelConfig,
  DEFAULT_PROVIDER_BY_CAPABILITY,
  type MediaCapability,
} from './providers';

describe('LLM provider registry (Phase 4)', () => {
  it('lists expected LLM providers including siliconflow', () => {
    expect(LLM_PROVIDERS).toEqual(['doubao', 'minimax', 'deepseek', 'openai', 'siliconflow']);
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

  it('every provider declares capabilities and a per-capability recommended model', () => {
    for (const p of LLM_PROVIDERS) {
      const config = LLM_PROVIDER_REGISTRY[p];
      expect(Array.isArray(config.capabilities)).toBe(true);
      expect(config.capabilities.length).toBeGreaterThan(0);
      for (const cap of config.capabilities) {
        expect(config.recommended[cap]).toBeTruthy();
      }
    }
  });

  it('siliconflow is image-only', () => {
    const sf = LLM_PROVIDER_REGISTRY.siliconflow;
    expect(sf.capabilities).toEqual(['image']);
  });

  it('default provider is supported', () => {
    expect(isValidLLMProvider(DEFAULT_LLM_PROVIDER)).toBe(true);
  });

  it('validates provider names', () => {
    expect(isValidLLMProvider('deepseek')).toBe(true);
    expect(isValidLLMProvider('siliconflow')).toBe(true);
    expect(isValidLLMProvider('gemini')).toBe(false);
    expect(isValidLLMProvider(null)).toBe(false);
    expect(isValidLLMProvider(123)).toBe(false);
  });

  it('providersForCapability returns only matching providers', () => {
    const textProviders = providersForCapability('text');
    expect(textProviders).toContain('deepseek');
    expect(textProviders).toContain('doubao');
    expect(textProviders).not.toContain('siliconflow');

    const imageProviders = providersForCapability('image');
    expect(imageProviders).toContain('siliconflow');
    expect(imageProviders).toContain('doubao');
    expect(imageProviders).not.toContain('deepseek');
  });

  it('defaultModelConfig returns sensible defaults per capability', () => {
    for (const cap of ['text', 'image', 'video'] as MediaCapability[]) {
      const cfg = defaultModelConfig(cap);
      expect(cfg.provider).toBe(DEFAULT_PROVIDER_BY_CAPABILITY[cap]);
      expect(cfg.baseUrl).toMatch(/^https?:\/\//);
      expect(cfg.model).toBeTruthy();
    }
  });
});