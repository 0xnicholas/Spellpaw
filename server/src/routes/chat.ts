import { Router, type Request, type Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import { auth, getUserId } from '../middleware';

export function chatRoutes(prisma: PrismaClient): Router {
  const router = Router();
  router.use(auth(prisma));

  router.get('/', async (_req: Request, res: Response) => {
    const userId = getUserId(_req);
    const chat = await prisma.chat.findUnique({ where: { userId } });
    if (!chat) {
      res.json({ messages: [] });
      return;
    }
    res.json({
      id: chat.id,
      messages: JSON.parse(chat.messages || '[]'),
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
    });
  });

  router.put('/', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { messages } = req.body;
    const chat = await prisma.chat.upsert({
      where: { userId },
      create: { userId, messages: JSON.stringify(messages || []) },
      update: { messages: JSON.stringify(messages || []) },
    });
    res.json({
      id: chat.id,
      messages: JSON.parse(chat.messages || '[]'),
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
    });
  });

  return router;
}
