/**
 * Spellpaw Tool Server — Express + ws implementation.
 *
 * Production-grade equivalent of `tool-server/spellpaw-tool-server.ts`
 * (the Vite dev plugin). Same protocol:
 *
 *   POST /tool    — Spellpaw Server calls this with { callId, params }
 *                    → forwards to browser via WS, awaits result
 *   WS   /tool-ws  — browser subscribes; receives tool_call messages,
 *                    replies with { callId, content, is_error }
 *
 * Both endpoints live on the same http.Server so the WebSocket upgrade
 * is handled inline.
 *
 * Use from `server/src/index.ts`:
 *
 *     const app = express();
 *     // ... mount API routes ...
 *     const httpServer = app.listen(PORT);
 *     attachToolServer(app, httpServer);
 */
import type { Server as HttpServer, IncomingMessage } from 'node:http';
import type { Express, Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';

interface PendingCall {
  resolve: (result: ToolResult) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  is_error: boolean;
}

const TIMEOUT_MS = 30_000;

/** Mount the tool-server endpoints onto an existing Express app + http.Server. */
export function attachToolServer(app: Express, httpServer: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set<WebSocket>();
  const pendingCalls = new Map<string, PendingCall>();

  // WebSocket upgrade: browsers open /tool-ws to receive tool invocations
  httpServer.on('upgrade', (req, socket, head) => {
    if (req.url === '/tool-ws') {
      // ws expects a Duplex stream; the upgrade 'socket' is compatible at runtime.
      wss.handleUpgrade(req, socket as unknown as import('node:net').Socket, head, (ws) => {
        clients.add(ws);
        console.log(`[tool-server] browser connected (${clients.size} client${clients.size > 1 ? 's' : ''})`);
        ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data.toString());
            const pending = pendingCalls.get(msg.callId);
            if (pending) {
              clearTimeout(pending.timer);
              pendingCalls.delete(msg.callId);
              console.log(`[tool-server] received result for call ${msg.callId}`);
              pending.resolve({
                content: msg.content ?? [{ type: 'text', text: '' }],
                is_error: msg.is_error ?? false,
              });
            }
          } catch {
            // Ignore malformed messages
          }
        });
        ws.on('close', () => {
          clients.delete(ws);
          console.log(`[tool-server] browser disconnected (${clients.size} client${clients.size === 1 ? '' : 's'} left)`);
        });
      });
    }
  });

  // HTTP endpoint: Spellpaw Server calls POST /tool to invoke a tool
  app.post('/tool', async (req: Request, res: Response) => {
    if (clients.size === 0) {
      console.error('[tool-server] /tool called but no browser connected to /tool-ws');
      res.status(503).json({
        content: [{ type: 'text', text: 'No browser connected to /tool-ws' }],
        is_error: true,
      });
      return;
    }

    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const callId = (body.callId as string) || (body.tool_call_id as string);
      const params = (body.params ?? {}) as Record<string, unknown>;

      if (!callId) {
        res.status(400).json({
          content: [{ type: 'text', text: 'Missing callId' }],
          is_error: true,
        });
        return;
      }

      const result = await new Promise<ToolResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          pendingCalls.delete(callId);
          reject(new Error('TIMEOUT'));
        }, TIMEOUT_MS);

        pendingCalls.set(callId, { resolve, reject, timer });

        console.log(`[tool-server] forwarding call ${callId} to ${clients.size} browser client(s)`);
        const message = JSON.stringify({ type: 'tool_call', callId, params });
        for (const client of clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        }
      });

      res.json(result);
    } catch (err) {
      const message = (err as Error).message === 'TIMEOUT'
        ? 'Tool execution timed out'
        : `Tool server error: ${(err as Error).message}`;
      res.status(504).json({
        content: [{ type: 'text', text: message }],
        is_error: true,
      });
    }
  });
}

/** Parse JSON body from raw IncomingMessage (kept for the dev Vite plugin variant). */
export function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error(`Invalid JSON: ${(e as Error).message}`));
      }
    });
    req.on('error', reject);
  });
}