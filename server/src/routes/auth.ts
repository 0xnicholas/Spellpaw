import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { auth, type AuthenticatedRequest } from '../middleware';

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

  router.get('/me', auth, async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: (req as AuthenticatedRequest).userId } });
    if (!user) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ id: user.id, email: user.email, name: user.name, avatar: user.avatar });
  });

  return router;
}
