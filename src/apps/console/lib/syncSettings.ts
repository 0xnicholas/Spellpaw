import { fetchSettings } from './consoleApi';
import { getSettings, setApiKey, setDoubaoApiKey } from '@drama/lib/imageGen';
import { getLLMSettings, setLLMSettings } from './llmSettings';

/**
 * Pull user settings from server and write them to localStorage.
 * Falls back to local values on error.
 */
export async function syncUserSettings(): Promise<void> {
  const server = await fetchSettings();
  if (!server) return;

  const localOpenAI = getSettings().openaiApiKey ?? '';
  if (server.openaiApiKey && server.openaiApiKey !== localOpenAI) {
    setApiKey(server.openaiApiKey);
  }

  const localDoubao = getSettings().doubaoApiKey ?? '';
  if (server.doubaoApiKey && server.doubaoApiKey !== localDoubao) {
    setDoubaoApiKey(server.doubaoApiKey);
  }

  const localLLM = getLLMSettings();
  setLLMSettings({
    provider: (server.llmProvider as 'spellpaw' | 'custom') || localLLM.provider,
    apiKey: server.llmApiKey ?? localLLM.apiKey,
    baseUrl: server.llmBaseUrl ?? localLLM.baseUrl,
    model: server.llmModel ?? localLLM.model,
  });
}
