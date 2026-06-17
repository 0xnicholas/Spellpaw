import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { auth, getUserId } from '../middleware';

const JWT_SECRET = process.env.JWT_SECRET!;

export function authRoutes(prisma: PrismaClient): Router {
  const router = Router();

  function signToken(user: { id: string; email: string }): string {
    return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  }

  router.post('/register', async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password || !name) { res.status(400).json({ error: 'Missing fields' }); return; }
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) { res.status(409).json({ error: 'Email already registered' }); return; }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({ data: { email, passwordHash, name } });
      res.status(201).json({ token: signToken(user), user: { id: user.id, email: user.email, name: user.name } });
    } catch { res.status(500).json({ error: 'Registration failed' }); }
  });

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !await bcrypt.compare(password, user.passwordHash)) {
        res.status(401).json({ error: 'Invalid credentials' }); return;
      }
      res.json({ token: signToken(user), user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar } });
    } catch { res.status(500).json({ error: 'Login failed' }); }
  });

  router.get('/me', auth(prisma), async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: getUserId(req) } });
    if (!user) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ id: user.id, email: user.email, name: user.name, avatar: user.avatar });
  });

  router.patch('/profile', auth(prisma), async (req, res) => {
    try {
      const { name, avatar } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }
      const user = await prisma.user.update({
        where: { id: getUserId(req) },
        data: { name: name.trim(), ...(avatar !== undefined && { avatar: avatar.trim() || null }) },
      });
      res.json({ id: user.id, email: user.email, name: user.name, avatar: user.avatar });
    } catch {
      res.status(500).json({ error: 'Profile update failed' });
    }
  });

  router.patch('/password', auth(prisma), async (_req, res) => {
    res.status(403).json({ error: 'Password change is currently disabled' });
  });

  router.get('/settings', auth(prisma), async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: getUserId(req) },
        select: { openaiApiKey: true, doubaoApiKey: true, llmProvider: true, llmApiKey: true, llmBaseUrl: true, llmModel: true },
      });
      if (!user) { res.status(404).json({ error: 'Not found' }); return; }
      res.json({
        openaiApiKey: user.openaiApiKey ?? '',
        doubaoApiKey: user.doubaoApiKey ?? '',
        llmProvider: user.llmProvider ?? 'spellpaw',
        llmApiKey: user.llmApiKey ?? '',
        llmBaseUrl: user.llmBaseUrl ?? '',
        llmModel: user.llmModel ?? '',
      });
    } catch {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  router.patch('/settings', auth(prisma), async (req, res) => {
    try {
      const { openaiApiKey, doubaoApiKey, llmProvider, llmApiKey, llmBaseUrl, llmModel } = req.body;
      const data: Record<string, string | null> = {};
      if (openaiApiKey !== undefined) data.openaiApiKey = openaiApiKey || null;
      if (doubaoApiKey !== undefined) data.doubaoApiKey = doubaoApiKey || null;
      if (llmProvider !== undefined) data.llmProvider = llmProvider || 'spellpaw';
      if (llmApiKey !== undefined) data.llmApiKey = llmApiKey || null;
      if (llmBaseUrl !== undefined) data.llmBaseUrl = llmBaseUrl || null;
      if (llmModel !== undefined) data.llmModel = llmModel || null;

      const user = await prisma.user.update({
        where: { id: getUserId(req) },
        data,
        select: { openaiApiKey: true, doubaoApiKey: true, llmProvider: true, llmApiKey: true, llmBaseUrl: true, llmModel: true },
      });
      res.json({
        openaiApiKey: user.openaiApiKey ?? '',
        doubaoApiKey: user.doubaoApiKey ?? '',
        llmProvider: user.llmProvider ?? 'spellpaw',
        llmApiKey: user.llmApiKey ?? '',
        llmBaseUrl: user.llmBaseUrl ?? '',
        llmModel: user.llmModel ?? '',
      });
    } catch {
      res.status(500).json({ error: 'Settings update failed' });
    }
  });

  return router;
}
