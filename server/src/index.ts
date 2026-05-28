import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { authRoutes } from './routes/auth';
import { projectRoutes } from './routes/projects';
import { templateRoutes } from './routes/templates';
import { galleryRoutes } from './routes/gallery';

const prisma = new PrismaClient();
const app = express();

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Mount routes
app.use('/api/auth', authRoutes(prisma));
app.use('/api/projects', projectRoutes(prisma));
app.use('/api/templates', templateRoutes(prisma));
app.use('/api/gallery', galleryRoutes(prisma));

async function main() {
  await prisma.$connect();
  app.listen(PORT, () => {
    console.log(`🧙 Spellpaw Server running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
