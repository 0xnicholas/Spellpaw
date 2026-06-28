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
  // Per-capability shape: pick the `chat` config for Copilot (Phase 4).
  // The server re-routes per-call to image/video/etc. via the per-tool
  // model header when the LLM actually issues a tool call.
  const settings = getLLMSettings();
  const chat = settings.chat ?? {
    provider: 'deepseek',
    apiKey: '',
    baseUrl: '',
    model: '',
  };
  logger.log('[spellpawProvider] getLLMSettings (chat):', {
    provider: chat.provider,
    hasApiKey: Boolean(chat.apiKey),
    baseUrl: chat.baseUrl,
    model: chat.model,
  });
  headers['X-LLM-Provider'] = chat.provider;
  if (chat.apiKey) headers['X-LLM-API-Key'] = chat.apiKey;
  if (chat.baseUrl) headers['X-LLM-Base-URL'] = chat.baseUrl;
  if (chat.model) headers['X-LLM-Model'] = chat.model;
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
    toolChoice?: ToolChoice,
    projectId?: string
  ): Promise<Session> {
    try {
      const res = await fetch(`${BASE_URL}/sessions`, {
        method: 'POST',
        headers: authHeaders(toolChoice),
        body: JSON.stringify({ title, system_prompt: systemPrompt, tools, projectId }),
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

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await fetch(`${BASE_URL}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      // 204 No Content is the success path; 404 also resolves (idempotent).
      // Network errors are logged but never thrown — deleteSession is a
      // best-effort cleanup that callers must not block on.
    } catch (err) {
      logger.warn('[spellpawProvider] deleteSession failed (best-effort):', err);
    }
  },

  subscribeSSE(sessionId: string, onEvent: (event: SSEEvent) => void): SSESubscription {
    let aborted = false;
    const controller = new AbortController();
    const SSE_TIMEOUT_MS = 60000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logger.error('[spellpawProvider] SSE timeout — no data received');
        aborted = true;
        controller.abort();
      }, SSE_TIMEOUT_MS);
    };

    (async () => {
      try {
        if (aborted) return;

        const res = await fetch(`${BASE_URL}/sessions/${sessionId}/events`, {
          headers: authHeaders(),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) return;
        aborted = false;
        resetTimeout();

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          resetTimeout();
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
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    })();

    return {
      close: () => {
        aborted = true;
        if (timeoutId) clearTimeout(timeoutId);
        controller.abort();
      },
    };
  },
};
