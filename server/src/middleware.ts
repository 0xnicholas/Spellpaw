import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET!;

export interface AuthenticatedRequest extends Request {
  userId: string;
}

export function getUserId(req: Request): string {
  return (req as unknown as AuthenticatedRequest).userId;
}

export function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const token = header.slice(7);
  // Demo account bypass
  if (token === 'demo-token') {
    (req as AuthenticatedRequest).userId = 'demo-user';
    next();
    return;
  }
  try {
    const payload = jwt.verify(token, SECRET) as { userId: string };
    (req as AuthenticatedRequest).userId = payload.userId;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}
