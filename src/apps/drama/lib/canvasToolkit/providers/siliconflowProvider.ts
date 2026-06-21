import OpenAI from 'openai';
import { config } from '@/shared/config';
import type { GenerationProvider, GenerationInput, GenerationTask, ProviderConfig } from '../types';

const SETTINGS_KEY = 'spellpaw_settings';
const PROXY_BASE_URL = `${config.serverBase}/api/v1/proxy/siliconflow`;
const DEFAULT_IMAGE_MODEL = 'black-forest-labs/FLUX.2-pro';

function readSettings(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function createSiliconflowProvider(): GenerationProvider {
  let config: ProviderConfig = {};

  return {
    id: 'siliconflow',
    name: '硅基流动 / SiliconFlow',
    supportedMedia: ['image'],
    capabilities: ['text2image'],
    requiredConfigKeys: ['siliconflowApiKey'],

    isConfigured() {
      if (typeof config.apiKey === 'string' && config.apiKey.length > 0) return true;
      const settings = readSettings();
      return typeof settings.siliconflowApiKey === 'string' && settings.siliconflowApiKey.length > 0;
    },

    configure(next) {
      const apiKey =
        typeof next.apiKey === 'string' && next.apiKey.length > 0
          ? next.apiKey
          : typeof next.siliconflowApiKey === 'string' && next.siliconflowApiKey.length > 0
            ? next.siliconflowApiKey
            : undefined;
      config = { ...config, ...next, ...(apiKey ? { apiKey } : {}) };
    },

    estimateCost(_input: GenerationInput) {
      return { amount: 1, unit: 'image' };
    },

    async submit(input: GenerationInput): Promise<GenerationTask> {
      const apiKey = config.apiKey ?? (readSettings().siliconflowApiKey as string | undefined);
      if (!apiKey) {
        return { taskId: '', status: 'failed', error: 'SiliconFlow API key not configured' };
      }

      const openai = new OpenAI({ apiKey, baseURL: PROXY_BASE_URL, dangerouslyAllowBrowser: true });
      const size = (input.options?.size as '1024x1024' | '1792x1024' | '1024x1792') ?? '1024x1024';

      try {
        const response = await openai.images.generate({
          model: (config.model as string | undefined) ?? DEFAULT_IMAGE_MODEL,
          prompt: input.prompt,
          n: 1,
          size,
        });
        const url = response.data?.[0]?.url;
        if (!url) {
          return { taskId: '', status: 'failed', error: 'No image URL in SiliconFlow response' };
        }
        return { taskId: `siliconflow_${Date.now()}`, status: 'done', resultUrl: url };
      } catch (err) {
        return { taskId: '', status: 'failed', error: (err as Error).message };
      }
    },
  };
}
