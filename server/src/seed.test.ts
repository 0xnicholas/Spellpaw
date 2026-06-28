import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildDemoLlmConfigsJson } from './seed.js';
import { DEFAULT_LLM_PROVIDER, LLM_PROVIDER_DEFAULTS } from './lib/providers.js';

const ENV_KEYS = [
  'DEMO_LLM_API_KEY',
  'DEMO_LLM_PROVIDER',
  'DEMO_LLM_BASE_URL',
  'DEMO_LLM_MODEL',
] as const;

function clearEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
}

describe('buildDemoLlmConfigsJson (Phase 4 demo-user chat seed)', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('uses defaults when no env vars are set (apiKey empty → chat will 400)', () => {
    const json = buildDemoLlmConfigsJson();
    const parsed = JSON.parse(json);
    expect(parsed.chat.provider).toBe(DEFAULT_LLM_PROVIDER);
    expect(parsed.chat.apiKey).toBe('');
    expect(parsed.chat.baseUrl).toBe(LLM_PROVIDER_DEFAULTS[DEFAULT_LLM_PROVIDER].baseUrl);
    expect(parsed.chat.model).toBeTruthy();
  });

  it('uses DEMO_LLM_API_KEY when set, with default provider', () => {
    process.env.DEMO_LLM_API_KEY = 'sk-demo-test';
    const json = buildDemoLlmConfigsJson();
    const parsed = JSON.parse(json);
    expect(parsed.chat.apiKey).toBe('sk-demo-test');
    expect(parsed.chat.provider).toBe(DEFAULT_LLM_PROVIDER);
  });

  it('honours all 4 env vars (provider, key, baseUrl, model)', () => {
    process.env.DEMO_LLM_API_KEY = 'sk-x';
    process.env.DEMO_LLM_PROVIDER = 'openai';
    process.env.DEMO_LLM_BASE_URL = 'https://api.openai.com/v1';
    process.env.DEMO_LLM_MODEL = 'gpt-5.5';
    const parsed = JSON.parse(buildDemoLlmConfigsJson()).chat;
    expect(parsed.provider).toBe('openai');
    expect(parsed.apiKey).toBe('sk-x');
    expect(parsed.baseUrl).toBe('https://api.openai.com/v1');
    expect(parsed.model).toBe('gpt-5.5');
  });

  it('falls back to default provider when DEMO_LLM_PROVIDER is invalid', () => {
    process.env.DEMO_LLM_API_KEY = 'sk-x';
    process.env.DEMO_LLM_PROVIDER = 'gemini'; // not in SUPPORTED_LLM_PROVIDERS
    const parsed = JSON.parse(buildDemoLlmConfigsJson()).chat;
    expect(parsed.provider).toBe(DEFAULT_LLM_PROVIDER);
    expect(parsed.apiKey).toBe('sk-x');
  });

  it('DEMO_LLM_MODEL falls back to provider recommended text model', () => {
    process.env.DEMO_LLM_PROVIDER = 'doubao';
    const parsed = JSON.parse(buildDemoLlmConfigsJson()).chat;
    expect(parsed.model).toBe(LLM_PROVIDER_DEFAULTS.doubao.recommended.text);
  });

  it('DEMO_LLM_BASE_URL falls back to provider baseUrl when empty', () => {
    process.env.DEMO_LLM_PROVIDER = 'openai';
    delete process.env.DEMO_LLM_BASE_URL;
    const parsed = JSON.parse(buildDemoLlmConfigsJson()).chat;
    expect(parsed.baseUrl).toBe(LLM_PROVIDER_DEFAULTS.openai.baseUrl);
  });
});
