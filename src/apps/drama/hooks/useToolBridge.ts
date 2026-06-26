/**
 * useToolBridge — WebSocket client for SpellPaw Tool Server
 *
 * Connects to /tool-ws, listens for tool_call messages from the Vite plugin,
 * executes them via toolRouter, and sends results back.
 */
import { useEffect, useRef, useCallback } from 'react';
import { toolRouter } from '@drama/stores/toolRouter';
import { useBuilderStore } from '@drama/stores/builderStore';
import { parseAndValidate } from '@shared/lib/builderSchema';
import { getTotalSteps } from '@shared/components/builder/registry';
import { logger } from '@shared/lib/logger';

interface ToolCallMessage {
  type: 'tool_call';
  callId: string;
  params: Record<string, unknown>;
}

function getCandidateUrls(): string[] {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host; // e.g. localhost:5173
  const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
  // Try 127.0.0.1 first — localhost can fail in headless Chrome / Playwright
  const hostnames = [`127.0.0.1:${port}`, host, `127.0.0.1.nip.io:${port}`];
  return hostnames.map((h) => `${protocol}://${h}/tool-ws`);
}

function connect(
  wsRef: React.MutableRefObject<WebSocket | null>,
  urls = getCandidateUrls(),
  urlIndex = 0,
  retries = 0,
) {
  const url = urls[urlIndex];
  if (!url) {
    logger.error('[useToolBridge] exhausted all candidate URLs', urls);
    return;
  }

  logger.log(`[useToolBridge] trying ${url} (attempt ${retries + 1})`);
  const ws = new WebSocket(url);

  ws.onopen = () => {
    logger.log(`[useToolBridge] connected to ${url}`);
  };

  ws.onmessage = async (event) => {
    try {
      const msg: ToolCallMessage = JSON.parse(event.data);
      if (msg.type !== 'tool_call') return;

      const { callId, params } = msg;
      const rawAction = params.action as string;
      // Tool names exposed to the LLM are prefixed with "spellpaw_"; the local router uses plain names.
      const action = rawAction.replace(/^spellpaw_/, '');

      // ③ Builder Renderer channel — spellpaw_build_ui
      if (action === 'build_ui') {
        // Build context for metadata validation (②)
        const treeNodes: string[] = [];
        const result = parseAndValidate(params, { treeNodes });
        if ('error' in result) {
          ws.send(JSON.stringify({
            callId,
            content: [{ type: 'text', text: result.error.error || '校验失败' }],
            is_error: true,
          }));
          return;
        }
        useBuilderStore.getState().setConfig(result.config, getTotalSteps(result.config.component));
        useBuilderStore.getState().setStatus('previewing');
        ws.send(JSON.stringify({
          callId,
          content: [{ type: 'text', text: '已渲染，请在 Builder 面板中确认' }],
          is_error: false,
        }));
        return;
      }

      // Try stripped action first, then raw action (handles spellpaw_skill_* which
      // strips to skill_* but is registered in toolRouter as spellpaw_skill_*)
      let handler = toolRouter[action];
      if (!handler) {
        handler = toolRouter[rawAction];
      }

      if (!handler) {
        ws.send(JSON.stringify({
          callId,
          content: [{ type: 'text', text: `Unknown action: ${action}` }],
          is_error: true,
        }));
        return;
      }

      const resultText = await handler(params as { action: string;[key: string]: unknown });
      ws.send(JSON.stringify({
        callId,
        content: [{ type: 'text', text: resultText }],
        is_error: false,
      }));
    } catch (err) {
      // Try to extract callId from the message for error reporting
      try {
        const msg = JSON.parse(event.data) as ToolCallMessage;
        ws.send(JSON.stringify({
          callId: msg.callId,
          content: [{ type: 'text', text: `Tool error: ${(err as Error).message}` }],
          is_error: true,
        }));
      } catch {
        // Cannot parse message, ignore
      }
    }
  };

  ws.onclose = (event) => {
    // If this ws is no longer the current one, it was closed by cleanup (e.g.
    // React StrictMode double mount/unmount). Don't retry.
    if (wsRef.current !== ws) return;

    logger.warn(`[useToolBridge] closed ${url} code=${event.code} reason=${event.reason}`);
    wsRef.current = null;

    // Try next URL after a few retries on the current one
    const maxRetriesPerUrl = 2;
    if (retries < maxRetriesPerUrl) {
      const delay = Math.pow(2, retries) * 1000;
      setTimeout(() => connect(wsRef, urls, urlIndex, retries + 1), delay);
    } else if (urlIndex < urls.length - 1) {
      logger.warn(`[useToolBridge] switching to fallback URL`);
      setTimeout(() => connect(wsRef, urls, urlIndex + 1, 0), 500);
    } else {
      logger.error('[useToolBridge] all WebSocket connection attempts failed');
    }
  };

  ws.onerror = (event) => {
    // Ignore errors from sockets that have already been replaced by cleanup.
    if (wsRef.current !== ws) return;
    logger.error(`[useToolBridge] error on ${url}`, event);
  };

  wsRef.current = ws;
}

export function useToolBridge() {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    connect(wsRef);

    return () => {
      // Close and clear the ref so onclose/onerror of this socket ignore retries.
      const ws = wsRef.current;
      wsRef.current = null;
      ws?.close();
    };
  }, []);

  const isConnected = useCallback(() => {
    return wsRef.current?.readyState === WebSocket.OPEN;
  }, []);

  return { isConnected };
}
