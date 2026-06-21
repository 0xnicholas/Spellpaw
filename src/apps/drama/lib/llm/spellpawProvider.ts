/**
 * Spellpaw Server LLM Provider implementation
 *
 * Talks to the Spellpaw Node.js backend.
 */
import { config } from '@/shared/config';
import { useAuthStore } from '@/shared/stores/authStore';
import { getLLMSettings } from '@console/lib/llmSettings';
import { logger } from '@shared/lib/logger';
import type { LLMProvider, Session, SSESubscription, ToolConfig, SSEEvent, ToolChoice } from './types';

const BASE_URL = config.llmBase || `${config.serverBase}/api/v1`;

function handleFetchError(err: unknown, action: string): never {
  const message = (err as Error).message || String(err);
  if (err instanceof TypeError || message.includes('fetch')) {
    throw new Error(
      `无法连接到 Spellpaw Server（${BASE_URL}）。请确认后端已启动，例如运行 "npm run dev:all"，或在 .env 中正确设置 VITE_SERVER_BASE。`
    );
  }
  throw new Error(`${action} 失败: ${message}`);
}

function authHeaders(toolChoice?: ToolChoice): Record<string, string> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const settings = getLLMSettings();
  logger.log('[spellpawProvider] getLLMSettings:', {
    provider: settings.provider,
    hasApiKey: Boolean(settings.apiKey),
    apiKeyPreview: settings.apiKey ? `${settings.apiKey.slice(0, 6)}...` : '(empty)',
    baseUrl: settings.baseUrl,
    model: settings.model,
  });
  headers['X-LLM-Provider'] = settings.provider;
  if (settings.apiKey) headers['X-LLM-API-Key'] = settings.apiKey;
  if (settings.baseUrl) headers['X-LLM-Base-URL'] = settings.baseUrl;
  if (settings.model) headers['X-LLM-Model'] = settings.model;
  if (toolChoice && toolChoice !== 'auto') {
    headers['X-LLM-Tool-Choice'] = JSON.stringify(toolChoice);
  }
  return headers;
}

export const spellpawProvider: LLMProvider = {
  async createSession(
    title: string,
    systemPrompt: string,
    tools: ToolConfig[] = [],
    toolChoice?: ToolChoice
  ): Promise<Session> {
    try {
      const res = await fetch(`${BASE_URL}/sessions`, {
        method: 'POST',
        headers: authHeaders(toolChoice),
        body: JSON.stringify({ title, system_prompt: systemPrompt, tools }),
      });
      if (!res.ok) throw new Error(`Create session failed: ${res.status}`);
      return res.json();
    } catch (err) {
      handleFetchError(err, '创建会话');
    }
  },

  async sendMessage(sessionId: string, content: string, toolChoice?: ToolChoice): Promise<void> {
    try {
      const res = await fetch(`${BASE_URL}/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: authHeaders(toolChoice),
        body: JSON.stringify({
          content: [{ type: 'text', text: content }],
        }),
      });
      if (!res.ok) throw new Error(`Send message failed: ${res.status}`);
    } catch (err) {
      handleFetchError(err, '发送消息');
    }
  },

  subscribeSSE(sessionId: string, onEvent: (event: SSEEvent) => void): SSESubscription {
    let aborted = false;
    const controller = new AbortController();

    (async () => {
      try {
        if (aborted) return;

        const res = await fetch(`${BASE_URL}/sessions/${sessionId}/events`, {
          headers: authHeaders(),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) return;
        aborted = false;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                onEvent(data);
              } catch { /* skip malformed */ }
            }
          }
        }
      } catch (err) {
        // AbortError is expected when the subscription is explicitly closed.
        const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message?.includes('aborted'));
        if (!isAbort) {
          logger.error('[spellpawProvider] SSE error:', err);
        }
      }
    })();

    return {
      close: () => {
        aborted = true;
        controller.abort();
      },
    };
  },
};
