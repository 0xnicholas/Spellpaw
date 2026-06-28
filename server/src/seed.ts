/**
 * Seed a user account with the canonical demo dataset.
 * Idempotent: clears existing seed-owned records and re-creates them.
 */
import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import {
  DEFAULT_LLM_PROVIDER,
  LLM_PROVIDER_DEFAULTS,
  isSupportedLLMProvider,
  type SupportedLLMProvider,
} from './lib/providers.js';
import { seedProjects, seedProjectCards, seedProjectEdges, seedChatMessages } from './seed-data.js';

/**
 * Canonical demo account credentials. The demo user lives in the DB so the
 * real /api/auth/login endpoint can authenticate it like any other account.
 *
 * Keep these in sync with any documentation that references the demo account.
 */
export const DEMO_USER = {
  id: 'demo-user',
  email: 'demo@spellpaw.xyz',
  password: 'password123',
  name: 'Demo User',
} as const;

/**
 * Legacy placeholder hash written by very old versions of the middleware bypass.
 * Detected so we can upgrade it to a real bcrypt hash on startup.
 */
const LEGACY_DEMO_HASH = 'demo-password-hash';

/**
 * Build the demo user's seed `llmConfigs` JSON from environment variables.
 *
 * - `DEMO_LLM_API_KEY` (required for chat to work) — the API key for the
 *   demo user's Copilot chat LLM. If unset, chat will fail with the usual
 *   400 ("LLM_API_KEY not configured") but everything else (canvas, media
 *   generation per-card) still works.
 * - `DEMO_LLM_PROVIDER` (optional, default 'deepseek')
 * - `DEMO_LLM_BASE_URL` (optional, default provider's baseUrl)
 * - `DEMO_LLM_MODEL` (optional, default provider's recommended text model)
 *
 * Only the `chat` slot is seeded here; the 9-fine media slots are populated
 * on first load by the browser's `syncUserSettings` (LLM_PROVIDER_DEFAULTS).
 */
export function buildDemoLlmConfigsJson(): string {
  const provider = (process.env.DEMO_LLM_PROVIDER ?? DEFAULT_LLM_PROVIDER) as string;
  const validProvider: SupportedLLMProvider = isSupportedLLMProvider(provider)
    ? provider
    : DEFAULT_LLM_PROVIDER;
  const defaults = LLM_PROVIDER_DEFAULTS[validProvider];
  const chat = {
    provider: validProvider,
    apiKey: process.env.DEMO_LLM_API_KEY ?? '',
    baseUrl: process.env.DEMO_LLM_BASE_URL || defaults.baseUrl,
    model:
      process.env.DEMO_LLM_MODEL ||
      defaults.recommended.text ||
      defaults.model,
  };
  return JSON.stringify({ chat });
}

export async function seedDemoUser(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { id: DEMO_USER.id } });

  if (!existing) {
    const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);
    await prisma.user.create({
      data: {
        id: DEMO_USER.id,
        email: DEMO_USER.email,
        name: DEMO_USER.name,
        passwordHash,
        llmConfigs: buildDemoLlmConfigsJson(),
      },
    });
  } else if (existing.passwordHash === LEGACY_DEMO_HASH) {
    const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);
    await prisma.user.update({
      where: { id: DEMO_USER.id },
      data: { passwordHash },
    });
  }

  await seedUser(prisma, DEMO_USER.id);
}

export async function seedUser(prisma: PrismaClient, userId: string): Promise<void> {
  const seedProjectIds = seedProjects.map((p) => p.id);

  // Seed projects only if they are missing. Existing seed projects (possibly edited by the user)
  // are left untouched so their version history is preserved.
  const existingIds = new Set(
    (await prisma.project.findMany({
      where: { userId, id: { in: seedProjectIds } },
      select: { id: true },
    })).map((p) => p.id)
  );

  for (const project of seedProjects) {
    if (existingIds.has(project.id)) continue;

    const cards = seedProjectCards[project.id] ?? [];
    const edges = seedProjectEdges[project.id] ?? [];
    await prisma.project.create({
      data: {
        id: project.id,
        userId,
        title: project.title,
        description: project.description,
        coverColor: project.coverColor,
        version: project.version,
        data: JSON.stringify({
          canvases: {
            nodes: cards,
            edges,
            viewport: { x: 0, y: 0, zoom: 1 },
          },
        }),
      },
    });
  }

  // Seed project-scoped chat histories
  for (const project of seedProjects) {
    const existingChat = await prisma.chat.findUnique({
      where: { userId_projectId: { userId, projectId: project.id } },
    });
    if (!existingChat) {
      await prisma.chat.create({
        data: {
          userId,
          projectId: project.id,
          messages:
            project.id === 'proj_1'
              ? JSON.stringify(seedChatMessages)
              : JSON.stringify([]),
        },
      });
    }
  }
}
