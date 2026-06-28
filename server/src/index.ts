/**
 * Spellpaw Server — production entry point.
 *
 * Single Node process serves:
 *   - REST API at /api/auth, /api/projects, /api/chat, /api/v1
 *   - Tool server (POST /tool + WS /tool-ws)
 *   - Static frontend SPA from ../dist in production
 *   - SPA fallback (index.html) for client-side routing
 *
 * Cloud-server deployment is "edit server/.env, npm install, npm run db:push,
 * npm run build, npm start". See DEPLOY.md.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { authRoutes } from './routes/auth.js';
import { projectRoutes } from './routes/projects.js';
import { chatRoutes } from './routes/chat.js';
import { llmRoutes } from './routes/llm.js';
import { proxyRoutes } from './routes/proxy.js';
import { seedDemoUser } from './seed.js';
import { attachToolServer } from './toolServer.js';
import { logger } from './lib/logger.js';

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

const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const ALLOWED_ORIGINS = CLIENT_ORIGIN.split(',').map((s) => s.trim());

// When the tool server runs in the SAME process as the API, default the
// endpoint to localhost:PORT so a single-server deploy works out of the box.
// Override with TOOL_SERVER_ENDPOINT when the tool server is on a different host.
const TOOL_SERVER_ENDPOINT =
  process.env.TOOL_SERVER_ENDPOINT || `http://localhost:${PORT}/tool`;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));

// REST API
app.use('/api/auth', authRoutes(prisma));
app.use('/api/projects', projectRoutes(prisma));
app.use('/api/chat', chatRoutes(prisma));
app.use('/api/v1', llmRoutes());
app.use('/api/v1/proxy', proxyRoutes());

// Frontend SPA (production only — `npm run build` produces ../dist)
// In dev the frontend is served by the Vite dev server on a separate port.
if (IS_PROD) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distDir = path.resolve(__dirname, '..', '..', 'dist');
  logger.log(`Serving frontend SPA from ${distDir}`);

  app.use(
    express.static(distDir, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        // index.html should always be re-fetched; assets are content-hashed.
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );

  // SPA fallback: any non-API GET returns index.html so client-side routing works.
  // Express 5 requires named wildcards (`{*splat}`).
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

async function main() {
  await prisma.$connect();
  await seedDemoUser(prisma);

  const httpServer = app.listen(PORT, () => {
    logger.log(`🧙 Spellpaw Server running on http://localhost:${PORT}`);
    logger.log(`   Tool endpoint: ${TOOL_SERVER_ENDPOINT}`);
    logger.log(`   CORS origins:   ${ALLOWED_ORIGINS.join(', ')}`);
    logger.log(`   Mode:           ${IS_PROD ? 'production' : 'development'}`);
  });

  // Attach tool server (POST /tool + WS /tool-ws) to the same http.Server
  attachToolServer(app, httpServer);
}

main().catch((err) => logger.error(err));