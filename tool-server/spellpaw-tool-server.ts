/**
 * Spellpaw Tool Server — Vite Plugin
 *
 * 提供 HTTP POST /tool 端点（接收 Spellpaw Server 转发的 tool 调用）
 * + WebSocket /tool-ws（转发给浏览器执行 store actions）。
 */
import type { Plugin, ViteDevServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

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

export function spellpawToolServer(): Plugin {
  return {
    name: 'spellpaw-tool-server',

    configureServer(server: ViteDevServer) {
      const wss = new WebSocketServer({ noServer: true });
      const clients = new Set<WebSocket>();
      const pendingCalls = new Map<string, PendingCall>();

      // --- WebSocket: browser connections ---
      server.httpServer?.on('upgrade', (req, socket, head) => {
        if (req.url === '/tool-ws') {
          wss.handleUpgrade(req, socket, head, (ws) => {
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

      // --- HTTP: Spellpaw Server tool call endpoint ---
      server.middlewares.use('/tool', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ content: [{ type: 'text', text: 'Method not allowed' }], is_error: true }));
          return;
        }

        if (clients.size === 0) {
          console.error('[tool-server] /tool called but no browser connected to /tool-ws');
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ content: [{ type: 'text', text: 'No browser connected to /tool-ws' }], is_error: true }));
          return;
        }

        try {
          const body = await parseBody(req);
          const tool_call_id = body.tool_call_id as string;
          const params = (body.params ?? {}) as Record<string, unknown>;

          const result = await new Promise<ToolResult>((resolve, reject) => {
            const timer = setTimeout(() => {
              pendingCalls.delete(tool_call_id);
              reject(new Error('TIMEOUT'));
            }, TIMEOUT_MS);

            pendingCalls.set(tool_call_id, { resolve, reject, timer });

            console.log(`[tool-server] forwarding call ${tool_call_id} to ${clients.size} browser client(s)`);
            const message = JSON.stringify({ type: 'tool_call', callId: tool_call_id, params });
            for (const client of clients) {
              if (client.readyState === WebSocket.OPEN) {
                client.send(message);
              }
            }
          });

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err) {
          const message = (err as Error).message === 'TIMEOUT'
            ? 'Tool execution timed out'
            : `Tool server error: ${(err as Error).message}`;
          res.statusCode = 504;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ content: [{ type: 'text', text: message }], is_error: true }));
        }
      });
    },
  };
}

/** Parse JSON body from IncomingMessage */
function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
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
