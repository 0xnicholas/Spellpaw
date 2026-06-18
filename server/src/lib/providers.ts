export const SUPPORTED_LLM_PROVIDERS = ['doubao', 'minimax', 'deepseek', 'openai'] as const;
export type SupportedLLMProvider = (typeof SUPPORTED_LLM_PROVIDERS)[number];

export const LLM_PROVIDER_DEFAULTS: Record<SupportedLLMProvider, { baseUrl: string; model: string }> = {
  doubao: { baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-seed-2-0-pro' },
  minimax: { baseUrl: 'https://api.minimax.chat/v1', model: 'MiniMax-Text-01' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-v4-flash' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-5.4-mini' },
};

export const DEFAULT_LLM_PROVIDER: SupportedLLMProvider = 'deepseek';

export function isSupportedLLMProvider(value: unknown): value is SupportedLLMProvider {
  return typeof value === 'string' && (SUPPORTED_LLM_PROVIDERS as readonly string[]).includes(value);
}
