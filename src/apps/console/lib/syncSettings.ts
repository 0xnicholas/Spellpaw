import { fetchSettings, type UserSettings } from './consoleApi';
import { setApiKey, setDoubaoApiKey, setMinimaxApiKey } from '@drama/lib/imageGen';
import { setLLMSettings } from './llmSettings';

/**
 * Pull user settings from server and write them to localStorage.
 * Falls back to local values on error.
 *
 * Phase 4: only the drama-app API keys (openai/doubao/minimax) still get
 * synced to spellpaw_settings. The new llmConfigs capability-grouped
 * settings live entirely on the server and are NOT mirrored to
 * localStorage (the console page reads them straight from the server on
 * each mount via fetchSettings).
 *
 * @param server Optional pre-fetched settings; if omitted, a fresh fetch is performed.
 */
export async function syncUserSettings(server?: UserSettings | null): Promise<void> {
  const settings = server ?? await fetchSettings();
  if (!settings) return;

  // Server wins for the drama-app keys; empty strings clear local values.
  setApiKey(settings.openaiApiKey ?? '');
  setDoubaoApiKey(settings.doubaoApiKey ?? '');
  setMinimaxApiKey(settings.minimaxApiKey ?? '');

  // Best-effort write of capability-grouped configs to localStorage so the
  // legacy `getLLMSettings({ drama })` migration path can still derive
  // image/video defaults from drama keys + anything that was previously
  // saved. Server is still source of truth.
  setLLMSettings(settings.llmConfigs);
}