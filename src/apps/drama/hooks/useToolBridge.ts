/**
 * useToolBridge — WebSocket client for SpellPaw Tool Server
 *
 * Connects to /tool-ws, listens for tool_call messages from the Vite plugin,
 * executes them via toolRouter, and sends results back.
 */
import { useEffect, useRef, useCallback } from 'react';
import { toolRouter } from '@drama/stores/toolRouter';

interface ToolCallMessage {
  type: 'tool_call';
  callId: string;
  params: Record<string, unknown>;
}

function connect(wsRef: React.MutableRefObject<WebSocket | null>, retries = 0) {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${protocol}://${window.location.host}/tool-ws`);

  ws.onmessage = async (event) => {
    try {
      const msg: ToolCallMessage = JSON.parse(event.data);
      if (msg.type !== 'tool_call') return;

      const { callId, params } = msg;
      const action = params.action as string;
      const handler = toolRouter[action];

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

  ws.onclose = () => {
    wsRef.current = null;
    if (retries < 3) {
      const delay = Math.pow(2, retries) * 1000;
      setTimeout(() => connect(wsRef, retries + 1), delay);
    }
  };

  ws.onerror = () => {
    ws.close();
  };

  wsRef.current = ws;
}

export function useToolBridge() {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    connect(wsRef);

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      wsRef.current?.close();
    };
  }, []);

  const isConnected = useCallback(() => {
    return wsRef.current?.readyState === WebSocket.OPEN;
  }, []);

  return { isConnected };
}
