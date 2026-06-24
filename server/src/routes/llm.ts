/**
 * LLM routes — Spellpaw Copilot API surface.
 *
 * Endpoints:
 *   POST   /api/v1/sessions
 *   POST   /api/v1/sessions/:id/messages
 *   GET    /api/v1/sessions/:id/events
 *   DELETE /api/v1/sessions/:id
 */
import { Router, type Request, type Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { auth, getUserId } from '../middleware';
import { streamChat, type ToolConfig, type LLMMessage } from '../lib/llmClient';
import { logger } from '../lib/logger';

interface SessionState {
  id: string;
  title: string;
  model: string;
  systemPrompt: string;
  tools: ToolConfig[];
  messages: LLMMessage[];
  userId: string;
  /** Epoch ms — updated on every access. Used for idle cleanup. */
  lastAccessedAt: number;
}

const sessions = new Map<string, SessionState>();

/** Sessions idle longer than this are evicted on the periodic sweep. */
const SESSION_IDLE_MS = 30 * 60 * 1000; // 30 minutes
/** How often the idle sweep runs. */
const SESSION_SWEEP_INTERVAL_MS = 60 * 1000; // 1 minute

let sweepTimer: NodeJS.Timeout | null = null;

/** Periodic sweep — drops sessions that have been idle for SESSION_IDLE_MS.
 *  Started lazily on first session create; never stopped (server lifetime). */
function ensureSweepRunning(): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const now = Date.now();
    let evicted = 0;
    for (const [id, session] of sessions) {
      if (now - session.lastAccessedAt > SESSION_IDLE_MS) {
        sessions.delete(id);
        evicted++;
      }
    }
    if (evicted > 0) {
      logger.log(`[llm route] idle sweep evicted ${evicted} session(s) (${sessions.size} remaining)`);
    }
  }, SESSION_SWEEP_INTERVAL_MS);
  // Allow the process to exit naturally during tests / shutdown.
  sweepTimer.unref?.();
}

function touch(session: SessionState): void {
  session.lastAccessedAt = Date.now();
}

function sanitizeSession(s: SessionState) {
  return { id: s.id, title: s.title, model: s.model };
}

export function llmRoutes(prisma: PrismaClient): Router {
  const router = Router();
  router.use(auth(prisma));

  router.post('/sessions', (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { title, system_prompt, tools = [] } = req.body;
    if (!system_prompt) { res.status(400).json({ error: 'system_prompt required' }); return; }

    const session: SessionState = {
      id: uuidv4(),
      title: title || 'Untitled',
      model: process.env.LLM_MODEL || 'gpt-5.4-mini',
      systemPrompt: system_prompt,
      tools,
      messages: [{ role: 'system', content: system_prompt }],
      userId,
      lastAccessedAt: Date.now(),
    };

    sessions.set(session.id, session);
    ensureSweepRunning();
    res.status(201).json(sanitizeSession(session));
  });

  router.post('/sessions/:id/messages', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const session = sessions.get(req.params.id as string);
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    if (session.userId !== userId) { res.status(403).json({ error: 'Forbidden' }); return; }
    touch(session);

    const { content } = req.body;
    if (!content || !Array.isArray(content)) { res.status(400).json({ error: 'content required' }); return; }

    const text = content.map((c: { type: string; text?: string }) => c.text).filter(Boolean).join('\n');
    logger.log(`[llm route] message received for session ${req.params.id}:`, text.slice(0, 120));
    session.messages.push({ role: 'user', content: text });

    res.status(202).end();
  });

  router.get('/sessions/:id/events', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const session = sessions.get(req.params.id as string);
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    if (session.userId !== userId) { res.status(403).json({ error: 'Forbidden' }); return; }
    touch(session);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (event: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      // streamChat mutates session.messages in place, appending assistant/tool
      // turns as needed. The event stream is forwarded to the client unchanged.
      // Allow per-request LLM overrides from the front-end settings.
      const context = {
        provider: req.headers['x-llm-provider'] as string | undefined,
        apiKey: req.headers['x-llm-api-key'] as string | undefined,
        baseUrl: req.headers['x-llm-base-url'] as string | undefined,
        model: req.headers['x-llm-model'] as string | undefined,
      };
      logger.log('[llm route] /events headers:', {
        provider: context.provider,
        hasApiKey: Boolean(context.apiKey),
        apiKeyPreview: context.apiKey ? `${context.apiKey.slice(0, 6)}...` : '(missing)',
        baseUrl: context.baseUrl,
        model: context.model,
      });
      for await (const event of streamChat({
        messages: session.messages,
        tools: session.tools,
        model: session.model,
      }, context)) {
        sendEvent(event);
      }
    } catch (err) {
      sendEvent({ type: 'error', message: (err as Error).message });
    } finally {
      res.end();
    }
  });

  router.delete('/sessions/:id', (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const session = sessions.get(req.params.id as string);
    if (!session) {
      // Idempotent: deleting a missing session is a no-op so the client can
      // call this defensively on cleanup paths.
      res.status(204).end();
      return;
    }
    if (session.userId !== userId) { res.status(403).json({ error: 'Forbidden' }); return; }

    sessions.delete(session.id);
    logger.log(`[llm route] session ${session.id} deleted (${sessions.size} remaining)`);
    res.status(204).end();
  });

  return router;
}
