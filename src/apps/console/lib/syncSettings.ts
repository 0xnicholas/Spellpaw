import { fetchSettings, type UserSettings } from './consoleApi';
import { setLLMSettings } from './llmSettings';

/**
 * Pull user settings from server and write them to localStorage.
 * Falls back to local values on error.
 *
 * Phase 4: the capability-grouped llmConfigs are mirrored to
 * localStorage so the drama canvas toolkit can read them synchronously
 * via capabilityConfig.ts. The console page reads them straight from
 * the server on each mount via fetchSettings.
 *
 * @param server Optional pre-fetched settings; if omitted, a fresh fetch is performed.
 */
export async function syncUserSettings(server?: UserSettings | null): Promise<void> {
  const settings = server ?? await fetchSettings();
  if (!settings) return;

  // Capability-grouped LLM configs — primary source for the new
  // canvasToolkit capabilityConfig resolver.
  setLLMSettings(settings.llmConfigs);
}