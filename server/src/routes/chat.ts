import { Router, type Request, type Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import { auth, getUserId } from '../middleware';

export function chatRoutes(prisma: PrismaClient): Router {
  const router = Router();
  router.use(auth());

  router.get('/:projectId', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
    const chat = await prisma.chat.findUnique({ where: { userId_projectId: { userId, projectId } } });
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

  router.put('/:projectId', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
    const { messages } = req.body;
    const chat = await prisma.chat.upsert({
      where: { userId_projectId: { userId, projectId } },
      create: { userId, projectId, messages: JSON.stringify(messages || []) },
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
