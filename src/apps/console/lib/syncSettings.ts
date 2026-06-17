import { fetchSettings } from './consoleApi';
import { setApiKey, setDoubaoApiKey, setMinimaxApiKey } from '@drama/lib/imageGen';
import { getLLMSettings, setLLMSettings, LLM_PROVIDERS, type LLMProviderType } from './llmSettings';

function isValidProvider(value: unknown): value is LLMProviderType {
  return typeof value === 'string' && (LLM_PROVIDERS as readonly string[]).includes(value);
}

/**
 * Pull user settings from server and write them to localStorage.
 * Falls back to local values on error.
 */
export async function syncUserSettings(): Promise<void> {
  const server = await fetchSettings();
  if (!server) return;

  setApiKey(server.openaiApiKey ?? '');
  setDoubaoApiKey(server.doubaoApiKey ?? '');
  setMinimaxApiKey(server.minimaxApiKey ?? '');

  const localLLM = getLLMSettings();
  setLLMSettings({
    provider: isValidProvider(server.llmProvider) ? server.llmProvider : localLLM.provider,
    apiKey: server.llmApiKey ?? localLLM.apiKey,
    baseUrl: server.llmBaseUrl ?? localLLM.baseUrl,
    model: server.llmModel ?? localLLM.model,
  });
}
