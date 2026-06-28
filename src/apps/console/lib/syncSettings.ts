import { fetchSettings, type UserSettings } from './consoleApi';
import { setLLMSettings, type LlmConfigs } from './llmSettings';

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
  // The server's `ConfigCapability` (fine-grained) is structurally
  // compatible with the LlmConfigs (media-bucketed) shape that
  // setLLMSettings expects, because each ModelConfig has the same 4
  // fields. We cast explicitly to keep the type-level distinction
  // (server = per-intent, localStorage = per-media).
  setLLMSettings(settings.llmConfigs as unknown as Partial<LlmConfigs>);
}
