import OpenAI from 'openai';
import { config } from '@/shared/config';
import type { GenerationProvider, GenerationInput, GenerationTask, ProviderConfig } from '../types';

const SETTINGS_KEY = 'spellpaw_settings';
const PROXY_BASE_URL = `${config.serverBase}/api/v1/proxy/openai`;

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
    name: 'OpenAI / GPT Image 2',
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

      const openai = new OpenAI({ apiKey, baseURL: PROXY_BASE_URL, dangerouslyAllowBrowser: true });
      // gpt-image-2 supports flexible sizes; fall back to the gpt-image-1 defaults
      // (1024x1024 / 1024x1536 / 1536x1024) which are also valid for gpt-image-2.
      const size = (input.options?.size as string | undefined) ?? '1024x1024';

      try {
        const response = await openai.images.generate({
          model: 'gpt-image-2',
          prompt: input.prompt,
          n: 1,
          size,
          // gpt-image-2 does not support the DALL-E 3 `style` parameter — removed.
          // Default response_format is b64_json for gpt-image models; force URL to
          // keep the existing data flow (resultUrl expected by callers).
          response_format: 'url',
        });
        const first = response.data?.[0];
        // Prefer url; fall back to b64_json (returned as data URL) if the server
        // ignores response_format or returns base64 anyway.
        const resultUrl = first?.url ?? (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : undefined);
        if (!resultUrl) {
          return { taskId: '', status: 'failed', error: 'No image data in OpenAI response' };
        }
        return { taskId: `openai_${Date.now()}`, status: 'done', resultUrl };
      } catch (err) {
        return { taskId: '', status: 'failed', error: (err as Error).message };
      }
    },
  };
}
