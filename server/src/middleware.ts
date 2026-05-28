import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET!;

export function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const payload = jwt.verify(header.slice(7), SECRET) as { userId: string };
    (req as any).userId = payload.userId;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}
