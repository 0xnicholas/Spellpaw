import { describe, it, expect, beforeEach } from 'vitest';
import { providerRegistry } from './registry';
import type { GenerationProvider } from './types';

function makeProvider(overrides: Partial<GenerationProvider>): GenerationProvider {
  return {
    id: 'mock',
    name: 'Mock',
    supportedMedia: ['image'],
    capabilities: ['text2image'],
    requiredConfigKeys: ['key'],
    isConfigured: () => false,
    configure: () => {},
    estimateCost: () => ({ amount: 1, unit: 'image' }),
    submit: async () => ({ taskId: '1', status: 'done' }),
    ...overrides,
  } as GenerationProvider;
}

beforeEach(() => {
  providerRegistry.clear();
});

describe('providerRegistry', () => {
  it('registers and retrieves a provider', () => {
    const p = makeProvider({ id: 'p1' });
    providerRegistry.register(p);
    expect(providerRegistry.get('p1')).toBe(p);
  });

  it('selects configured provider by capability', () => {
    providerRegistry.register(makeProvider({ id: 'img', isConfigured: () => true }));
    providerRegistry.register(makeProvider({ id: 'vid', supportedMedia: ['video'], capabilities: ['text2video'], isConfigured: () => true }));

    const result = providerRegistry.select({ type: 'image', capability: 'text2image', prompt: 'x' });
    expect('provider' in result && result.provider.id).toBe('img');
  });

  it('errors when no provider matches capability', () => {
    providerRegistry.register(makeProvider({ id: 'img', isConfigured: () => true }));
    const result = providerRegistry.select({ type: 'video', capability: 'text2video', prompt: 'x' });
    expect('error' in result).toBe(true);
  });

  it('errors when preferred provider is not configured', () => {
    providerRegistry.register(makeProvider({ id: 'img', isConfigured: () => false }));
    const result = providerRegistry.select({ type: 'image', capability: 'text2image', prompt: 'x' }, 'img');
    expect('error' in result).toBe(true);
  });
});
