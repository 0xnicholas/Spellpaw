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
import { logger } from './lib/logger.js';
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

/**
 * Decide whether `ensureDemoLlmConfig` should overwrite the demo user's
 * stored `llmConfigs` with the env-derived one.
 *
 * Returns true only when:
 *  - `envApiKey` is set (operator wants to seed a key), AND
 *  - the stored `llmConfigs` is missing or has an empty `chat.apiKey`.
 *
 * The second clause is critical: we never overwrite a user-edited config.
 * If the demo user logged into Console > Integrations and entered a key
 * themselves, the env migration must not clobber that on the next restart.
 */
export function shouldPatchDemoLlmConfig(
  envApiKey: string | undefined,
  storedLlmConfigs: string | null | undefined,
): boolean {
  if (!envApiKey) return false;
  if (!storedLlmConfigs) return true;
  try {
    const parsed = JSON.parse(storedLlmConfigs) as { chat?: { apiKey?: string } } | null;
    if (parsed && typeof parsed === 'object' && parsed.chat && parsed.chat.apiKey) {
      return false;
    }
  } catch {
    // Malformed stored JSON — treat as empty and patch.
    return true;
  }
  return true;
}

/**
 * Patch the demo user's `llmConfigs` JSON with the env-derived config
 * when the stored `chat.apiKey` is empty. No-op when:
 *  - `DEMO_LLM_API_KEY` env is unset, or
 *  - the demo user does not exist yet (regular seed creates them
 *    with the right config), or
 *  - the stored `chat.apiKey` is non-empty (user-edited; preserve).
 *
 * Returns one of: 'patched' | 'skipped-empty-env' | 'skipped-user-not-found'
 * | 'skipped-already-set' — for the caller to log.
 */
export async function ensureDemoLlmConfig(
  prisma: PrismaClient,
): Promise<'patched' | 'skipped-empty-env' | 'skipped-user-not-found' | 'skipped-already-set'> {
  const envApiKey = process.env.DEMO_LLM_API_KEY;
  if (!envApiKey) return 'skipped-empty-env';

  const existing = await prisma.user.findUnique({
    where: { id: DEMO_USER.id },
    select: { llmConfigs: true },
  });
  if (!existing) return 'skipped-user-not-found';

  if (!shouldPatchDemoLlmConfig(envApiKey, existing.llmConfigs)) {
    return 'skipped-already-set';
  }

  await prisma.user.update({
    where: { id: DEMO_USER.id },
    data: { llmConfigs: buildDemoLlmConfigsJson() },
  });
  return 'patched';
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

  // Migration: if the operator added DEMO_LLM_API_KEY to server/.env
  // *after* the demo user was first seeded, the existing row would
  // have an empty chat.apiKey and chat would 400. Backfill it from
  // the env (preserves any user-edited config).
  const patchResult = await ensureDemoLlmConfig(prisma);
  logger.log(`[seed] demo user llmConfig backfill: ${patchResult}`);

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
