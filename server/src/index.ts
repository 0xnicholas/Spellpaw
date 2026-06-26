import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { authRoutes } from './routes/auth';
import { projectRoutes } from './routes/projects';
import { chatRoutes } from './routes/chat';
import { llmRoutes } from './routes/llm';
import { proxyRoutes } from './routes/proxy';
import { seedDemoUser } from './seed';
import { logger } from './lib/logger';

config(); // Load .env

const prisma = new PrismaClient();
const app = express();

if (!process.env.JWT_SECRET) {
  logger.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

if (!process.env.PORT) {
  logger.error('PORT environment variable is required (e.g. PORT=3002)');
  process.exit(1);
}

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const ALLOWED_ORIGINS = CLIENT_ORIGIN.split(',').map(s => s.trim());
const PORT = process.env.PORT;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, etc.)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Mount routes
app.use('/api/auth', authRoutes(prisma));
app.use('/api/projects', projectRoutes(prisma));
app.use('/api/chat', chatRoutes(prisma));
app.use('/api/v1', llmRoutes());
app.use('/api/v1/proxy', proxyRoutes());

async function main() {
  await prisma.$connect();
  await seedDemoUser(prisma);
  app.listen(PORT, () => {
    logger.log(`🧙 Spellpaw Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => logger.error(err));
