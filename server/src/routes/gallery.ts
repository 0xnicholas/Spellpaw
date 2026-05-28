import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware';

export function galleryRoutes(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const items = await prisma.galleryItem.findMany({
      orderBy: { likes: 'desc' }, take: 50,
      include: {
        project: { select: { id: true, title: true, description: true, coverColor: true, updatedAt: true } },
        user: { select: { id: true, name: true } },
      },
    });
    res.json(items);
  });

  router.post('/', auth, async (req, res) => {
    const { projectId } = req.body;
    await prisma.project.update({ where: { id: projectId }, data: { isPublic: true } });
    const item = await prisma.galleryItem.create({ data: { userId: (req as any).userId, projectId } });
    res.status(201).json(item);
  });

  router.post('/:id/like', async (req, res) => {
    await prisma.galleryItem.update({ where: { id: req.params.id }, data: { likes: { increment: 1 } } });
    res.json({ ok: true });
  });

  return router;
}
