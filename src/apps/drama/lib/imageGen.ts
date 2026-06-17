/**
 * Shared localStorage settings helpers for provider API keys.
 *
 * Used by both the Drama studio and the Console app to read/write
 * user-configured provider credentials.
 */

const SETTINGS_KEY = 'spellpaw_settings';

export function setApiKey(key: string): void {
  const settings = getSettings();
  settings.openaiApiKey = key;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getDoubaoApiKey(): string | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw).doubaoApiKey ?? null;
  } catch { /* ignore */ }
  return null;
}

export function setDoubaoApiKey(key: string): void {
  const settings = getSettings();
  settings.doubaoApiKey = key;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getMinimaxApiKey(): string | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw).minimaxApiKey ?? null;
  } catch { /* ignore */ }
  return null;
}

export function setMinimaxApiKey(key: string): void {
  const settings = getSettings();
  settings.minimaxApiKey = key;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getSettings(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
