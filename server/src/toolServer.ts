/**
 * Spellpaw Tool Server — Express + ws implementation.
 *
 * Production-grade equivalent of `tool-server/spellpaw-tool-server.ts`
 * (the Vite dev plugin). Same protocol:
 *
 *   POST /tool    — Spellpaw Server calls this with { callId, projectId, params }
 *                    → forwards to browser via WS, awaits result
 *   WS   /tool-ws  — browser subscribes with ?token=<jwt>&projectId=<id>;
 *                    receives tool_call messages,
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
import jwt from 'jsonwebtoken';
import { auth, getUserId } from './middleware.js';

interface PendingCall {
  resolve: (result: ToolResult) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
  userId: string;
  projectId: string;
}

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  is_error: boolean;
}

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  projectId?: string;
}

const TIMEOUT_MS = 30_000;

const SECRET = process.env.JWT_SECRET;

/** Mount the tool-server endpoints onto an existing Express app + http.Server. */
export function attachToolServer(app: Express, httpServer: HttpServer): void {
  if (!SECRET) {
    throw new Error('JWT_SECRET is required to attach the tool server');
  }

  const wss = new WebSocketServer({ noServer: true });
  // clients[userId][projectId] = Set<WebSocket>
  const clients = new Map<string, Map<string, Set<AuthenticatedWebSocket>>>();
  const pendingCalls = new Map<string, PendingCall>();

  function getClientSet(userId: string, projectId: string): Set<AuthenticatedWebSocket> | undefined {
    return clients.get(userId)?.get(projectId);
  }

  function addClient(userId: string, projectId: string, ws: AuthenticatedWebSocket): void {
    let byProject = clients.get(userId);
    if (!byProject) {
      byProject = new Map<string, Set<AuthenticatedWebSocket>>();
      clients.set(userId, byProject);
    }
    let set = byProject.get(projectId);
    if (!set) {
      set = new Set<AuthenticatedWebSocket>();
      byProject.set(projectId, set);
    }
    set.add(ws);
  }

  function removeClient(ws: AuthenticatedWebSocket): void {
    const { userId, projectId } = ws;
    if (!userId || !projectId) return;
    const set = clients.get(userId)?.get(projectId);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) {
      clients.get(userId)?.delete(projectId);
      if (clients.get(userId)?.size === 0) {
        clients.delete(userId);
      }
    }
  }

  function countClients(): number {
    let total = 0;
    for (const byProject of clients.values()) {
      for (const set of byProject.values()) {
        total += set.size;
      }
    }
    return total;
  }

  // WebSocket upgrade: browsers open /tool-ws?token=...&projectId=...
  httpServer.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith('/tool-ws')) return;

    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    const projectId = url.searchParams.get('projectId');

    if (!token || !projectId) {
      console.error('[tool-server] /tool-ws missing token or projectId');
      socket.destroy();
      return;
    }

    let payload: { userId: string };
    try {
      payload = jwt.verify(token, SECRET) as { userId: string };
    } catch {
      console.error('[tool-server] /tool-ws invalid token');
      socket.destroy();
      return;
    }

    // ws expects a Duplex stream; the upgrade 'socket' is compatible at runtime.
    wss.handleUpgrade(req, socket as unknown as import('node:net').Socket, head, (ws) => {
      const authWs = ws as AuthenticatedWebSocket;
      authWs.userId = payload.userId;
      authWs.projectId = projectId;
      addClient(payload.userId, projectId, authWs);
      console.log(`[tool-server] browser connected (${countClients()} client${countClients() > 1 ? 's' : ''})`);

      authWs.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          const pending = pendingCalls.get(msg.callId);
          if (!pending) return;

          // Only accept results from the same user/project that initiated the call.
          if (authWs.userId !== pending.userId || authWs.projectId !== pending.projectId) {
            return;
          }

          clearTimeout(pending.timer);
          pendingCalls.delete(msg.callId);
          console.log(`[tool-server] received result for call ${msg.callId}`);
          pending.resolve({
            content: msg.content ?? [{ type: 'text', text: '' }],
            is_error: msg.is_error ?? false,
          });
        } catch {
          // Ignore malformed messages
        }
      });

      authWs.on('close', () => {
        removeClient(authWs);
        console.log(`[tool-server] browser disconnected (${countClients()} client${countClients() === 1 ? '' : 's'} left)`);
      });
    });
  });

  // HTTP endpoint: Spellpaw Server calls POST /tool to invoke a tool
  app.post('/tool', auth(), async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const callId = (body.callId as string) || (body.tool_call_id as string);
    const projectId = body.projectId as string | undefined;
    const params = (body.params ?? {}) as Record<string, unknown>;

    if (!callId) {
      res.status(400).json({
        content: [{ type: 'text', text: 'Missing callId' }],
        is_error: true,
      });
      return;
    }

    if (!projectId) {
      res.status(400).json({
        content: [{ type: 'text', text: 'Missing projectId' }],
        is_error: true,
      });
      return;
    }

    const target = getClientSet(userId, projectId);
    if (!target || target.size === 0) {
      console.error('[tool-server] /tool called but no browser connected for this user/project');
      res.status(503).json({
        content: [{ type: 'text', text: 'No browser connected to /tool-ws for this project' }],
        is_error: true,
      });
      return;
    }

    try {
      const result = await new Promise<ToolResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          pendingCalls.delete(callId);
          reject(new Error('TIMEOUT'));
        }, TIMEOUT_MS);

        pendingCalls.set(callId, { resolve, reject, timer, userId, projectId });

        console.log(`[tool-server] forwarding call ${callId} to ${target.size} browser client(s)`);
        const message = JSON.stringify({ type: 'tool_call', callId, params });
        for (const client of target) {
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
