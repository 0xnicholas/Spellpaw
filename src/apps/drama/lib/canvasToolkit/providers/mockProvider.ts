/**
 * Mock image/video generation provider.
 *
 * Useful for local development and demos: it never calls an external API,
 * always reports itself as configured, and returns a deterministic placeholder
 * image so the canvas card flow can be tested end-to-end without API keys.
 */
import type { GenerationProvider, GenerationInput, GenerationTask, ProviderConfig } from '../types';

function buildPlaceholderUrl(prompt: string): string {
  const short = prompt.slice(0, 24).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const hue = Math.floor(Math.random() * 360);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(${hue}, 70%, 80%)" />
          <stop offset="100%" stop-color="hsl(${(hue + 60) % 360}, 70%, 60%)" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#g)" />
      <rect x="40" y="180" width="432" height="120" rx="12" fill="rgba(0,0,0,0.5)" />
      <text x="256" y="230" text-anchor="middle" fill="white" font-size="22" font-family="sans-serif">MOCK</text>
      <text x="256" y="270" text-anchor="middle" fill="white" font-size="16" font-family="sans-serif">${short}</text>
      <text x="256" y="470" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="14" font-family="sans-serif">Spellpaw Mock Provider</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createMockProvider(): GenerationProvider {
  return {
    id: 'mock',
    name: 'Mock 占位生成',
    supportedMedia: ['image', 'video'],
    capabilities: ['text2image', 'image2image', 'styleTransfer', 'inpaint'],
    requiredConfigKeys: [],

    isConfigured() {
      return true;
    },

    configure(_config: ProviderConfig) {
      // no-op
    },

    estimateCost(_input: GenerationInput) {
      return { amount: 0, unit: 'mock' };
    },

    async submit(input: GenerationInput): Promise<GenerationTask> {
      const prompt = input.prompt || 'mock image';
      // For video requests we still return a placeholder image so the card
      // thumbnail works in the UI; the card itself will be marked as deliverable.
      const url = buildPlaceholderUrl(prompt);
      return {
        taskId: `mock_${Date.now()}`,
        status: 'done',
        resultUrl: url,
      };
    },
  };
}
