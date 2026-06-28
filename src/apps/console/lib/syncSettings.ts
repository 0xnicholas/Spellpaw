import { fetchSettings, type UserSettings } from './consoleApi';
import { setApiKey, setDoubaoApiKey, setMinimaxApiKey } from '@drama/lib/imageGen';
import { setLLMSettings } from './llmSettings';

/**
 * Pull user settings from server and write them to localStorage.
 * Falls back to local values on error.
 *
 * Phase 4: both the drama-app API keys (openai/doubao/minimax) AND the
 * capability-grouped llmConfigs are mirrored to localStorage so the
 * drama canvas toolkit can read them synchronously. The console page
 * reads them straight from the server on each mount via fetchSettings.
 *
 * @param server Optional pre-fetched settings; if omitted, a fresh fetch is performed.
 */
export async function syncUserSettings(server?: UserSettings | null): Promise<void> {
  const settings = server ?? await fetchSettings();
  if (!settings) return;

  // Drama-app keys (back-compat with older drama code that reads these).
  setApiKey(settings.openaiApiKey ?? '');
  setDoubaoApiKey(settings.doubaoApiKey ?? '');
  setMinimaxApiKey(settings.minimaxApiKey ?? '');

  // Capability-grouped LLM configs — primary source for the new
  // canvasToolkit capabilityConfig resolver.
  setLLMSettings(settings.llmConfigs);
}