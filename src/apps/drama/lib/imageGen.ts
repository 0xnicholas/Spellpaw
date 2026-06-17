/**
 * AI Image generation — DALL·E 3 via OpenAI SDK
 *
 * API key stored in localStorage (spellpaw_settings).
 */
import OpenAI from 'openai';

const SETTINGS_KEY = 'spellpaw_settings';

function getApiKey(): string | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw).openaiApiKey ?? null;
  } catch { /* ignore */ }
  return null;
}

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

interface GenerateOptions {
  prompt: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  style?: 'vivid' | 'natural';
}

/**
 * Generate an image from a text prompt.
 * Returns the image URL.
 */
export async function generateImage(options: GenerateOptions): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('OpenAI API key not configured. Set it in Settings.');

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: options.prompt,
    n: 1,
    size: options.size ?? '1024x1024',
    style: options.style ?? 'vivid',
  });

  const url = response.data?.[0]?.url;
  if (!url) throw new Error('No image URL in response');
  return url;
}

/**
 * Build an image generation prompt from scene/shot metadata.
 */
export function buildImagePrompt(node: {
  title: string;
  type: string;
  metadata?: {
    description?: string;
    location?: string;
    timeOfDay?: string;
    shotType?: string;
    visualStyle?: string;
  };
}): string {
  const m = node.metadata ?? {};
  const parts: string[] = [];

  parts.push(`Cinematic storyboard frame for a short drama scene.`);

  if (m.description) {
    parts.push(m.description);
  }

  parts.push(`Scene: "${node.title}".`);

  if (m.shotType) parts.push(`Shot type: ${m.shotType}.`);
  if (m.location) parts.push(`Location: ${m.location}.`);
  if (m.timeOfDay) parts.push(`Time of day: ${m.timeOfDay}.`);
  if (m.visualStyle) parts.push(`Visual style: ${m.visualStyle}.`);

  parts.push('Vertical 9:16 aspect ratio, cinematic lighting, photorealistic, unwatermarked.');

  return parts.join(' ');
}
