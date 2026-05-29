import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { auth, type AuthenticatedRequest } from '../middleware';

export function projectRoutes(prisma: PrismaClient): Router {
  const router = Router();
  router.use(auth);

  router.get('/', async (req, res) => {
    const projects = await prisma.project.findMany({
      where: { userId: (req as AuthenticatedRequest).userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, description: true, coverColor: true, version: true, updatedAt: true, isPublic: true },
    });
    res.json(projects);
  });

  router.get('/:id', async (req, res) => {
    const project = await prisma.project.findFirst({ where: { id: req.params.id, userId: (req as AuthenticatedRequest).userId } });
    if (!project) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(project);
  });

  router.post('/', async (req, res) => {
    const { title, description, coverColor, data } = req.body;
    const project = await prisma.project.create({
      data: { userId: (req as AuthenticatedRequest).userId, title, description: description || '', coverColor: coverColor || '#6366f1', data: data || '{}' },
    });
    res.status(201).json(project);
  });

  router.put('/:id', async (req, res) => {
    const existing = await prisma.project.findFirst({ where: { id: req.params.id, userId: (req as AuthenticatedRequest).userId } });
    if (!existing) { res.status(404).json({ error: 'Not found' }); return; }
    const { title, description, coverColor, data, version } = req.body;
    if (version !== undefined && existing.version !== version) {
      res.status(409).json({ error: 'Conflict', serverVersion: existing.version }); return;
    }
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(coverColor !== undefined && { coverColor }),
        ...(data !== undefined && { data }),
        version: { increment: 1 },
      },
    });
    res.json(project);
  });

  router.delete('/:id', async (req, res) => {
    await prisma.project.deleteMany({ where: { id: req.params.id, userId: (req as AuthenticatedRequest).userId } });
    res.status(204).end();
  });

  return router;
}
