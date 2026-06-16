import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { seedUser } from './seed';

const SECRET = process.env.JWT_SECRET!;

export interface AuthenticatedRequest extends Request {
  userId: string;
}

export function getUserId(req: Request): string {
  return (req as unknown as AuthenticatedRequest).userId;
}

export function auth(prisma: PrismaClient) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const token = header.slice(7);

    // Demo account bypass: ensure demo user exists in DB and seed demo data
    if (token === 'demo-token') {
      const demoUserId = 'demo-user';
      const demoEmail = 'demo@spellpaw.xyz';
      const demoPassword = 'password123';
      const existing = await prisma.user.findUnique({ where: { id: demoUserId } });
      if (!existing) {
        const passwordHash = await bcrypt.hash(demoPassword, 10);
        await prisma.user.create({
          data: {
            id: demoUserId,
            email: demoEmail,
            name: 'Demo User',
            passwordHash,
          },
        });
        await seedUser(prisma, demoUserId);
      } else if (existing.passwordHash === 'demo-password-hash') {
        // Migrate old placeholder demo hash to a real bcrypt hash
        const passwordHash = await bcrypt.hash(demoPassword, 10);
        await prisma.user.update({ where: { id: demoUserId }, data: { passwordHash } });
      }
      (req as AuthenticatedRequest).userId = demoUserId;
      next();
      return;
    }

    try {
      const payload = jwt.verify(token, SECRET) as { userId: string };
      (req as AuthenticatedRequest).userId = payload.userId;
      next();
    } catch { res.status(401).json({ error: 'Invalid token' }); }
  };
}
