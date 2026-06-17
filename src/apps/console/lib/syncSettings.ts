import { fetchSettings } from './consoleApi';
import { setApiKey, setDoubaoApiKey, setMinimaxApiKey } from '@drama/lib/imageGen';
import { setLLMSettings, isValidProvider, DEFAULT_PROVIDER } from './llmSettings';

/**
 * Pull user settings from server and write them to localStorage.
 * Falls back to local values on error.
 */
export async function syncUserSettings(): Promise<void> {
  const server = await fetchSettings();
  if (!server) return;

  // Server wins for all keys; empty strings clear local values.
  setApiKey(server.openaiApiKey ?? '');
  setDoubaoApiKey(server.doubaoApiKey ?? '');
  setMinimaxApiKey(server.minimaxApiKey ?? '');

  setLLMSettings({
    provider: isValidProvider(server.llmProvider) ? server.llmProvider : DEFAULT_PROVIDER,
    apiKey: server.llmApiKey ?? '',
    baseUrl: server.llmBaseUrl ?? '',
    model: server.llmModel ?? '',
  });
}
