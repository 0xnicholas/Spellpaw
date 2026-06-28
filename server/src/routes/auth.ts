import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { auth, getUserId } from '../middleware.js';

/**
 * Fallback display name when a registration request omits the `name` field.
 * Uses the local-part of the email (e.g. "alice" from "alice@example.com"),
 * with the first letter capitalized. The user can change this later from
 * the profile settings.
 */
function deriveNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  if (!local) return email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

// ── Phase 4: capability-grouped LLM configs ──────────────────────────
//
// `llmConfigs` is a JSON string with shape:
//   { chat: ModelConfig, text2image: ModelConfig, image2image: ModelConfig, ... }
//
// `chat` is the LLM provider used by the Copilot chat surface (text
// completion, tool calling, streaming). The 9-fine media-generation
// keys (text2image, image2image, ...) configure the drama canvas
// toolkit's per-intent image/video/audio/3D providers.
//
// ModelConfig = { provider, apiKey, baseUrl, model }
//
// On GET, if llmConfigs is missing/null we synthesize best-effort defaults
// from the supported provider registry (the legacy llmProvider/llmApiKey*
// fields are gone from the DB so there's nothing else to read from).
// PATCH always writes to llmConfigs only.

interface ModelConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

const CONFIG_CAPABILITIES = [
  // Copilot chat LLM (text completion / tool calling).
  // Distinct from the media-generation keys below.
  'chat',
  // 9-fine media generation (drama canvas toolkit).
  'text2image',
  'image2image',
  'inpaint',
  'text2video',
  'image2video',
  'styleTransfer',
  'text2audio',
  'text2model',
  'image2model',
] as const;

type ConfigCapability = (typeof CONFIG_CAPABILITIES)[number];

type LlmConfigs = Partial<Record<ConfigCapability, ModelConfig>>;

function parseLlmConfigs(raw: string | null | undefined): Partial<LlmConfigs> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    const out: Partial<LlmConfigs> = {};
    for (const cap of CONFIG_CAPABILITIES) {
      const c = (parsed as Record<string, unknown>)[cap];
      if (!c || typeof c !== 'object') continue;
      const cc = c as Record<string, unknown>;
      out[cap] = {
        provider: typeof cc.provider === 'string' ? cc.provider : '',
        apiKey: typeof cc.apiKey === 'string' ? cc.apiKey : '',
        baseUrl: typeof cc.baseUrl === 'string' ? cc.baseUrl : '',
        model: typeof cc.model === 'string' ? cc.model : '',
      };
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

function serializeLlmConfigs(c: Partial<LlmConfigs>): string {
  return JSON.stringify(c);
}

const JWT_SECRET = process.env.JWT_SECRET!;

export function authRoutes(prisma: PrismaClient): Router {
  const router = Router();

  function signToken(user: { id: string; email: string }): string {
    return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  }

  router.post('/register', async (req, res) => {
    try {
      const { email, password, name } = req.body as { email?: string; password?: string; name?: string };
      if (!email || !password) { res.status(400).json({ error: 'Missing fields' }); return; }
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) { res.status(409).json({ error: 'Email already registered' }); return; }
      const passwordHash = await bcrypt.hash(password, 10);
      const displayName = (typeof name === 'string' && name.trim()) ? name.trim() : deriveNameFromEmail(email);
      const user = await prisma.user.create({ data: { email, passwordHash, name: displayName } });
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

  router.get('/me', auth(), async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: getUserId(req) } });
    if (!user) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ id: user.id, email: user.email, name: user.name, avatar: user.avatar });
  });

  router.patch('/profile', auth(), async (req, res) => {
    try {
      const { name, avatar } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }
      const user = await prisma.user.update({
        where: { id: getUserId(req) },
        data: { name: name.trim(), ...(avatar !== undefined && { avatar: avatar.trim() || null }) },
      });
      res.json({ id: user.id, email: user.email, name: user.name, avatar: user.avatar });
    } catch {
      res.status(500).json({ error: 'Profile update failed' });
    }
  });

  router.patch('/password', auth(), async (_req, res) => {
    res.status(403).json({ error: 'Password change is currently disabled' });
  });

  router.get('/settings', auth(), async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: getUserId(req) },
        select: { llmConfigs: true },
      });
      if (!user) { res.status(404).json({ error: 'Not found' }); return; }

      const llmConfigs = parseLlmConfigs(user.llmConfigs);

      res.json({
        llmConfigs: llmConfigs ?? {},
      });
    } catch {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  router.patch('/settings', auth(), async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;

      // Capability-grouped configs only. Accept either:
      //   { llmConfigs: { text: {...}, image: {...}, video: {...} } }
      // or partial patches like { 'llmConfigs.text': {...} }.
      const existing = await prisma.user.findUnique({
        where: { id: getUserId(req) },
        select: { llmConfigs: true },
      });
      if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

      const merged: Partial<LlmConfigs> = parseLlmConfigs(existing.llmConfigs) ?? {};

      if (body.llmConfigs && typeof body.llmConfigs === 'object') {
        const incoming = parseLlmConfigs(JSON.stringify(body.llmConfigs));
        if (incoming) Object.assign(merged, incoming);
      } else {
        // Partial patch keys (llmConfigs.text2image / .image2image / etc.)
        for (const cap of CONFIG_CAPABILITIES) {
          const key = `llmConfigs.${cap}`;
          if (body[key] !== undefined) {
            const parsed = parseLlmConfigs(JSON.stringify({ [cap]: body[key] }));
            if (parsed?.[cap]) merged[cap] = parsed[cap];
          }
        }
      }

      const user = await prisma.user.update({
        where: { id: getUserId(req) },
        data: { llmConfigs: serializeLlmConfigs(merged) },
        select: { llmConfigs: true },
      });

      res.json({
        llmConfigs: parseLlmConfigs(user.llmConfigs) ?? {},
      });
    } catch {
      res.status(500).json({ error: 'Settings update failed' });
    }
  });

  return router;
}
