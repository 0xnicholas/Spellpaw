/**
 * LLM Provider factory — resolves the active provider from configuration.
 *
 * Default: spellpaw (Spellpaw Server backend)
 */
import { config } from '@/shared/config';
import type { LLMProvider, LLMProviderName } from './types';
import { spellpawProvider } from './spellpawProvider';

const providers: Record<LLMProviderName, LLMProvider> = {
  spellpaw: spellpawProvider,
  // All named model providers are currently proxied through Spellpaw Server.
  doubao: spellpawProvider,
  minimax: spellpawProvider,
  deepseek: spellpawProvider,
  openai: spellpawProvider,
  siliconflow: spellpawProvider,
};

export function getLLMProvider(name?: LLMProviderName): LLMProvider {
  const providerName = name ?? (config.llmProvider as LLMProviderName) ?? 'spellpaw';
  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${providerName}`);
  }
  return provider;
}

export * from './types';
export { spellpawProvider } from './spellpawProvider';
