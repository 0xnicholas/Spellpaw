import type { GenerationProvider, GenerationInput } from './types';

class ProviderRegistry {
  private providers: Map<string, GenerationProvider> = new Map();

  register(provider: GenerationProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): GenerationProvider | undefined {
    return this.providers.get(id);
  }

  list(): GenerationProvider[] {
    return Array.from(this.providers.values());
  }

  ids(): string[] {
    return Array.from(this.providers.keys());
  }

  clear(): void {
    this.providers.clear();
  }

  select(input: GenerationInput, preferredId?: string): { provider: GenerationProvider } | { error: string } {
    if (preferredId) {
      const provider = this.providers.get(preferredId);
      if (!provider) {
        return { error: `未找到 provider: ${preferredId}` };
      }
      if (!provider.isConfigured()) {
        return {
          error: `Provider ${preferredId} 未配置。需要设置: ${provider.requiredConfigKeys.join(', ')}`,
        };
      }
      if (!this.supports(provider, input)) {
        return { error: `Provider ${preferredId} 不支持 ${input.capability}` };
      }
      return { provider };
    }

    for (const provider of this.providers.values()) {
      if (provider.isConfigured() && this.supports(provider, input)) {
        return { provider };
      }
    }

    const configured = this.list()
      .filter((p) => p.isConfigured())
      .map((p) => p.id)
      .join(', ') || '无';
    return {
      error: `没有已配置的 provider 支持 ${input.type}/${input.capability}。已配置: ${configured}`,
    };
  }

  private supports(provider: GenerationProvider, input: GenerationInput): boolean {
    return (
      provider.supportedMedia.includes(input.type) &&
      provider.capabilities.includes(input.capability)
    );
  }
}

export const providerRegistry = new ProviderRegistry();
