import OpenAI from 'openai';
import type { GenerationProvider, GenerationInput, GenerationTask, ProviderConfig } from '../types';

const SETTINGS_KEY = 'spellpaw_settings';

function readSettings(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function createOpenAIProvider(): GenerationProvider {
  let config: ProviderConfig = {};

  return {
    id: 'openai',
    name: 'OpenAI / DALL·E 3',
    supportedMedia: ['image'],
    capabilities: ['text2image'],
    requiredConfigKeys: ['openaiApiKey'],

    isConfigured() {
      if (typeof config.apiKey === 'string' && config.apiKey.length > 0) return true;
      const settings = readSettings();
      return typeof settings.openaiApiKey === 'string' && settings.openaiApiKey.length > 0;
    },

    configure(next) {
      const apiKey =
        typeof next.apiKey === 'string' && next.apiKey.length > 0
          ? next.apiKey
          : typeof next.openaiApiKey === 'string' && next.openaiApiKey.length > 0
            ? next.openaiApiKey
            : undefined;
      config = { ...config, ...next, ...(apiKey ? { apiKey } : {}) };
    },

    estimateCost(_input: GenerationInput) {
      return { amount: 1, unit: 'image' };
    },

    async submit(input: GenerationInput): Promise<GenerationTask> {
      const apiKey = config.apiKey ?? (readSettings().openaiApiKey as string | undefined);
      if (!apiKey) {
        return { taskId: '', status: 'failed', error: 'OpenAI API key not configured' };
      }

      const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      const size = (input.options?.size as '1024x1024' | '1792x1024' | '1024x1792') ?? '1024x1024';

      try {
        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt: input.prompt,
          n: 1,
          size,
          style: 'vivid',
        });
        const url = response.data?.[0]?.url;
        if (!url) {
          return { taskId: '', status: 'failed', error: 'No image URL in OpenAI response' };
        }
        return { taskId: `openai_${Date.now()}`, status: 'done', resultUrl: url };
      } catch (err) {
        return { taskId: '', status: 'failed', error: (err as Error).message };
      }
    },
  };
}
