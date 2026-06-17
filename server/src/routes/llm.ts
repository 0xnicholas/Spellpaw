/**
 * LLM routes — Spellpaw Copilot API surface.
 *
 * Endpoints:
 *   POST   /api/v1/sessions
 *   POST   /api/v1/sessions/:id/messages
 *   GET    /api/v1/sessions/:id/events
 */
import { Router, type Request, type Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { auth, getUserId } from '../middleware';
import { streamChat, type ToolConfig, type LLMMessage } from '../lib/llmClient';

interface SessionState {
  id: string;
  title: string;
  model: string;
  systemPrompt: string;
  tools: ToolConfig[];
  messages: LLMMessage[];
  userId: string;
}

const sessions = new Map<string, SessionState>();

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
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      systemPrompt: system_prompt,
      tools,
      messages: [{ role: 'system', content: system_prompt }],
      userId,
    };

    sessions.set(session.id, session);
    res.status(201).json(sanitizeSession(session));
  });

  router.post('/sessions/:id/messages', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const session = sessions.get(req.params.id as string);
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    if (session.userId !== userId) { res.status(403).json({ error: 'Forbidden' }); return; }

    const { content } = req.body;
    if (!content || !Array.isArray(content)) { res.status(400).json({ error: 'content required' }); return; }

    const text = content.map((c: { type: string; text?: string }) => c.text).filter(Boolean).join('\n');
    console.log(`[llm route] message received for session ${req.params.id}:`, text.slice(0, 120));
    session.messages.push({ role: 'user', content: text });

    res.status(202).end();
  });

  router.get('/sessions/:id/events', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const session = sessions.get(req.params.id as string);
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    if (session.userId !== userId) { res.status(403).json({ error: 'Forbidden' }); return; }

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

  return router;
}
