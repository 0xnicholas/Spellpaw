import { describe, it, expect, beforeEach } from 'vitest';
import { getCapabilityConfig } from './capabilityConfig';

const LLMS_KEY = 'spellpaw_llm_settings';

describe('getCapabilityConfig', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing is configured', () => {
    expect(getCapabilityConfig('text2image')).toBeNull();
    expect(getCapabilityConfig('image2image')).toBeNull();
    expect(getCapabilityConfig('inpaint')).toBeNull();
    expect(getCapabilityConfig('text2video')).toBeNull();
    expect(getCapabilityConfig('image2video')).toBeNull();
    expect(getCapabilityConfig('styleTransfer')).toBeNull();
  });

  it('returns the text2image config from llmConfigs', () => {
    localStorage.setItem(LLMS_KEY, JSON.stringify({
      text2image: { provider: 'doubao', apiKey: 'ark-img', baseUrl: 'https://ark.example/v3', model: 'doubao-seedream-5-0-lite' },
    }));
    const got = getCapabilityConfig('text2image');
    expect(got?.provider).toBe('doubao');
    expect(got?.apiKey).toBe('ark-img');
    expect(got?.model).toBe('doubao-seedream-5-0-lite');
  });

  it('returns the image2image config independently from text2image', () => {
    localStorage.setItem(LLMS_KEY, JSON.stringify({
      text2image: { provider: 'doubao', apiKey: 'ark-1', baseUrl: 'u', model: 'm-text2image' },
      image2image: { provider: 'siliconflow', apiKey: 'sf-2', baseUrl: 'u-sf', model: 'FLUX.2-dev' },
    }));
    expect(getCapabilityConfig('text2image')?.apiKey).toBe('ark-1');
    expect(getCapabilityConfig('image2image')?.apiKey).toBe('sf-2');
    expect(getCapabilityConfig('image2image')?.model).toBe('FLUX.2-dev');
  });

  it('returns the inpaint config', () => {
    localStorage.setItem(LLMS_KEY, JSON.stringify({
      inpaint: { provider: 'doubao', apiKey: 'ark-inpaint', baseUrl: 'u', model: 'doubao-seedream-5-0-lite' },
    }));
    expect(getCapabilityConfig('inpaint')?.apiKey).toBe('ark-inpaint');
  });

  it('returns the text2video config from llmConfigs', () => {
    localStorage.setItem(LLMS_KEY, JSON.stringify({
      text2video: { provider: 'doubao', apiKey: 'ark-vid', baseUrl: 'u', model: 'doubao-seedance-2-5' },
    }));
    const got = getCapabilityConfig('text2video');
    expect(got?.provider).toBe('doubao');
    expect(got?.apiKey).toBe('ark-vid');
    expect(got?.model).toBe('doubao-seedance-2-5');
  });

  it('returns the image2video config independently from text2video', () => {
    localStorage.setItem(LLMS_KEY, JSON.stringify({
      text2video: { provider: 'doubao', apiKey: 'ark-t2v', baseUrl: 'u', model: 'doubao-seedance-2-5' },
      image2video: { provider: 'minimax', apiKey: 'mini-i2v', baseUrl: 'u', model: 'MiniMax-Video-01' },
    }));
    expect(getCapabilityConfig('text2video')?.apiKey).toBe('ark-t2v');
    expect(getCapabilityConfig('image2video')?.apiKey).toBe('mini-i2v');
  });

  it('returns the styleTransfer config', () => {
    localStorage.setItem(LLMS_KEY, JSON.stringify({
      styleTransfer: { provider: 'siliconflow', apiKey: 'sf-style', baseUrl: 'u', model: 'FLUX.2-pro' },
    }));
    expect(getCapabilityConfig('styleTransfer')?.provider).toBe('siliconflow');
  });

  it('returns null if the matching capability has no apiKey', () => {
    localStorage.setItem(LLMS_KEY, JSON.stringify({
      text2image: { provider: 'doubao', apiKey: '', baseUrl: 'u', model: 'm' },
    }));
    expect(getCapabilityConfig('text2image')).toBeNull();
  });

  it('returns null for an unconfigured capability even when others are set', () => {
    localStorage.setItem(LLMS_KEY, JSON.stringify({
      text2image: { provider: 'doubao', apiKey: 'ark', baseUrl: 'u', model: 'm' },
    }));
    expect(getCapabilityConfig('image2image')).toBeNull();
  });

  it('ignores invalid llmConfigs JSON', () => {
    localStorage.setItem(LLMS_KEY, 'not-json');
    expect(getCapabilityConfig('text2image')).toBeNull();
  });
});