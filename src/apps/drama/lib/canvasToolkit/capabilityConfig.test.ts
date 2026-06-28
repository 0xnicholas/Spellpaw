import { describe, it, expect, beforeEach } from 'vitest';
import { getCapabilityConfig, getCapabilityApiKey } from './capabilityConfig';

const LLMS_KEY = 'spellpaw_llm_settings';
const LEGACY_KEY = 'spellpaw_settings';

describe('getCapabilityConfig', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing is configured', () => {
    expect(getCapabilityConfig('image')).toBeNull();
    expect(getCapabilityConfig('video')).toBeNull();
    expect(getCapabilityConfig('text')).toBeNull();
  });

  it('returns the image config from llmConfigs', () => {
    localStorage.setItem(LLMS_KEY, JSON.stringify({
      image: { provider: 'doubao', apiKey: 'ark-img', baseUrl: 'https://ark.example/v3', model: 'doubao-seedream-5-0-lite' },
    }));
    const got = getCapabilityConfig('image');
    expect(got?.provider).toBe('doubao');
    expect(got?.apiKey).toBe('ark-img');
    expect(got?.model).toBe('doubao-seedream-5-0-lite');
  });

  it('returns the video config from llmConfigs', () => {
    localStorage.setItem(LLMS_KEY, JSON.stringify({
      video: { provider: 'minimax', apiKey: 'eyJ-vid', baseUrl: 'https://minimax.example/v1', model: 'MiniMax-Video-01' },
    }));
    const got = getCapabilityConfig('video');
    expect(got?.provider).toBe('minimax');
    expect(got?.apiKey).toBe('eyJ-vid');
    expect(got?.model).toBe('MiniMax-Video-01');
  });

  it('returns the text config from llmConfigs', () => {
    localStorage.setItem(LLMS_KEY, JSON.stringify({
      text: { provider: 'deepseek', apiKey: 'sk-txt', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-v4-flash' },
    }));
    const got = getCapabilityConfig('text');
    expect(got?.apiKey).toBe('sk-txt');
  });

  it('returns null if the matching capability has no apiKey', () => {
    localStorage.setItem(LLMS_KEY, JSON.stringify({
      image: { provider: 'doubao', apiKey: '', baseUrl: 'u', model: 'm' },
    }));
    expect(getCapabilityConfig('image')).toBeNull();
  });

  it('falls back to legacy spellpaw_settings keys when llmConfigs absent', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({
      doubaoApiKey: 'ark-legacy',
      doubaoImageModel: 'doubao-seedream-5-0-lite',
    }));
    const got = getCapabilityConfig('image');
    expect(got?.apiKey).toBe('ark-legacy');
  });

  it('falls back to legacy openai key for image when no doubao key', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({
      openaiApiKey: 'sk-legacy',
    }));
    const got = getCapabilityConfig('image');
    expect(got?.apiKey).toBe('sk-legacy');
  });

  it('falls back to legacy minimax key for video when no doubao key', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({
      minimaxApiKey: 'eyJ-mini',
    }));
    const got = getCapabilityConfig('video');
    expect(got?.apiKey).toBe('eyJ-mini');
  });

  it('prefers llmConfigs over legacy keys when both exist', () => {
    localStorage.setItem(LLMS_KEY, JSON.stringify({
      image: { provider: 'siliconflow', apiKey: 'sf-new', baseUrl: 'u', model: 'm' },
    }));
    localStorage.setItem(LEGACY_KEY, JSON.stringify({
      doubaoApiKey: 'ark-legacy',
    }));
    const got = getCapabilityConfig('image');
    expect(got?.apiKey).toBe('sf-new');
    expect(got?.provider).toBe('siliconflow');
  });

  it('getCapabilityApiKey returns just the apiKey', () => {
    localStorage.setItem(LLMS_KEY, JSON.stringify({
      image: { provider: 'doubao', apiKey: 'ark-img', baseUrl: 'u', model: 'm' },
    }));
    expect(getCapabilityApiKey('image')).toBe('ark-img');
    expect(getCapabilityApiKey('video')).toBeNull();
  });

  it('ignores invalid llmConfigs JSON', () => {
    localStorage.setItem(LLMS_KEY, 'not-json');
    expect(getCapabilityConfig('image')).toBeNull();
  });
});