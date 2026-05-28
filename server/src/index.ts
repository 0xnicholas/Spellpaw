import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'spellpaw-dev-jwt-secret';
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ---- Types ----
interface JwtPayload { userId: string; email: string; }

function signToken(user: { id: string; email: string }): string {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token: string): JwtPayload | null {
  try { return jwt.verify(token, JWT_SECRET) as JwtPayload; }
  catch { return null; }
}

// Auth middleware
function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const payload = verifyToken(header.slice(7));
  if (!payload) { res.status(401).json({ error: 'Invalid token' }); return; }
  (req as any).userId = payload.userId;
  next();
}

// ---- Auth Routes ----

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) { res.status(400).json({ error: 'Missing fields' }); return; }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(409).json({ error: 'Email already registered' }); return; }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, passwordHash, name } });
    const token = signToken(user);
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) { res.status(500).json({ error: 'Registration failed' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid credentials' }); return;
    }
    const token = signToken(user);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar } });
  } catch (err) { res.status(500).json({ error: 'Login failed' }); }
});

app.get('/api/auth/me', auth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: (req as any).userId } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json({ id: user.id, email: user.email, name: user.name, avatar: user.avatar });
});

// ---- Project Routes ----

app.get('/api/projects', auth, async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { userId: (req as any).userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, description: true, coverColor: true, version: true, updatedAt: true, isPublic: true },
  });
  res.json(projects);
});

app.get('/api/projects/:id', auth, async (req, res) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: (req as any).userId },
  });
  if (!project) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(project);
});

app.post('/api/projects', auth, async (req, res) => {
  const { title, description, coverColor, data } = req.body;
  const project = await prisma.project.create({
    data: { userId: (req as any).userId, title, description: description || '', coverColor: coverColor || '#6366f1', data: data || '{}' },
  });
  res.status(201).json(project);
});

app.put('/api/projects/:id', auth, async (req, res) => {
  const existing = await prisma.project.findFirst({ where: { id: req.params.id, userId: (req as any).userId } });
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  const { title, description, coverColor, data, version } = req.body;
  // Optimistic: only update if version matches (basic conflict detection)
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

app.delete('/api/projects/:id', auth, async (req, res) => {
  await prisma.project.deleteMany({ where: { id: req.params.id, userId: (req as any).userId } });
  res.status(204).end();
});

// ---- Template Marketplace ----

app.get('/api/templates', async (_req, res) => {
  const templates = await prisma.template.findMany({
    orderBy: { downloads: 'desc' },
    select: { id: true, name: true, description: true, category: true, downloads: true, createdAt: true, author: { select: { name: true } } },
  });
  res.json(templates);
});

app.get('/api/templates/:id', async (req, res) => {
  const template = await prisma.template.findUnique({ where: { id: req.params.id } });
  if (!template) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(template);
});

app.post('/api/templates', auth, async (req, res) => {
  const { name, description, category, data } = req.body;
  const template = await prisma.template.create({
    data: { authorId: (req as any).userId, name, description: description || '', category: category || 'custom', data },
  });
  res.status(201).json(template);
});

app.post('/api/templates/:id/download', async (req, res) => {
  await prisma.template.update({ where: { id: req.params.id }, data: { downloads: { increment: 1 } } });
  res.json({ ok: true });
});

// ---- Gallery ----

app.get('/api/gallery', async (_req, res) => {
  const items = await prisma.galleryItem.findMany({
    orderBy: { likes: 'desc' },
    take: 50,
    include: {
      project: { select: { id: true, title: true, description: true, coverColor: true, updatedAt: true } },
      user: { select: { id: true, name: true } },
    },
  });
  res.json(items);
});

app.post('/api/gallery', auth, async (req, res) => {
  const { projectId } = req.body;
  // Make project public
  await prisma.project.update({ where: { id: projectId }, data: { isPublic: true } });
  const item = await prisma.galleryItem.create({
    data: { userId: (req as any).userId, projectId },
  });
  res.status(201).json(item);
});

app.post('/api/gallery/:id/like', async (req, res) => {
  await prisma.galleryItem.update({ where: { id: req.params.id }, data: { likes: { increment: 1 } } });
  res.json({ ok: true });
});

// ---- Start ----

async function main() {
  await prisma.$connect();
  // Push schema (creates tables if not exist)
  const { execSync } = await import('child_process');
  const { fileURLToPath } = await import('url');
  const __dirname = new URL('.', import.meta.url).pathname;
  execSync('npx prisma db push --skip-generate', { cwd: __dirname + '..', stdio: 'inherit' });

  app.listen(PORT, () => {
    console.log(`🧙 Spellpaw Server running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
