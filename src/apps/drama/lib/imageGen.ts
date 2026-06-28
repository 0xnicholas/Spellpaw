/**
 * Drama-side localStorage helper.
 *
 * Phase 4: provider credentials are stored under `spellpaw_llm_settings`
 * keyed by capability (text / image / video). The legacy per-provider
 * fields (openaiApiKey / doubaoApiKey / minimaxApiKey) are no longer
 * read or written here. Use @drama/lib/canvasToolkit/capabilityConfig
 * to read the current capability config.
 *
 * The `getSettings` helper remains for any callers that still want a raw
 * read of the legacy settings blob (it returns an empty object by default
 * since the old key is no longer maintained).
 */

export function getSettings(): Record<string, string> {
  try {
    const raw = localStorage.getItem('spellpaw_settings');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}