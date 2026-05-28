import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware';

export function templateRoutes(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const templates = await prisma.template.findMany({
      orderBy: { downloads: 'desc' },
      select: { id: true, name: true, description: true, category: true, downloads: true, createdAt: true, author: { select: { name: true } } },
    });
    res.json(templates);
  });

  router.get('/:id', async (req, res) => {
    const template = await prisma.template.findUnique({ where: { id: req.params.id } });
    if (!template) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(template);
  });

  router.post('/', auth, async (req, res) => {
    const { name, description, category, data } = req.body;
    const template = await prisma.template.create({
      data: { authorId: (req as any).userId, name, description: description || '', category: category || 'custom', data },
    });
    res.status(201).json(template);
  });

  router.post('/:id/download', async (req, res) => {
    await prisma.template.update({ where: { id: req.params.id }, data: { downloads: { increment: 1 } } });
    res.json({ ok: true });
  });

  return router;
}
