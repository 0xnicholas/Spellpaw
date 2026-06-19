import { fetchSettings, type UserSettings } from './consoleApi';
import { setApiKey, setDoubaoApiKey, setMinimaxApiKey } from '@drama/lib/imageGen';
import { setLLMSettings, isValidProvider, DEFAULT_PROVIDER } from './llmSettings';

/**
 * Pull user settings from server and write them to localStorage.
 * Falls back to local values on error.
 *
 * @param server Optional pre-fetched settings; if omitted, a fresh fetch is performed.
 */
export async function syncUserSettings(server?: UserSettings | null): Promise<void> {
  const settings = server ?? await fetchSettings();
  if (!settings) return;

  // Server wins for all keys; empty strings clear local values.
  setApiKey(settings.openaiApiKey ?? '');
  setDoubaoApiKey(settings.doubaoApiKey ?? '');
  setMinimaxApiKey(settings.minimaxApiKey ?? '');

  setLLMSettings({
    provider: isValidProvider(settings.llmProvider) ? settings.llmProvider : DEFAULT_PROVIDER,
    apiKey: settings.llmApiKey ?? '',
    apiKeys: settings.llmApiKeys ?? {},
    baseUrl: settings.llmBaseUrl ?? '',
    model: settings.llmModel ?? '',
  });
}
