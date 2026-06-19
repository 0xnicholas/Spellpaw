import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { auth, getUserId } from '../middleware';
import { DEFAULT_LLM_PROVIDER, isSupportedLLMProvider, SUPPORTED_LLM_PROVIDERS, type SupportedLLMProvider } from '../lib/providers';

function normalizeLlmProvider(value: unknown): SupportedLLMProvider {
  return isSupportedLLMProvider(value) ? value : DEFAULT_LLM_PROVIDER;
}

type LlmApiKeys = Partial<Record<SupportedLLMProvider, string>>;

function parseLlmApiKeys(raw: string | null): LlmApiKeys {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const keys: LlmApiKeys = {};
    for (const provider of SUPPORTED_LLM_PROVIDERS) {
      const value = parsed[provider];
      if (typeof value === 'string') keys[provider] = value;
    }
    return keys;
  } catch {
    return {};
  }
}

function serializeLlmApiKeys(keys: LlmApiKeys): string {
  return JSON.stringify(keys);
}

const JWT_SECRET = process.env.JWT_SECRET!;

export function authRoutes(prisma: PrismaClient): Router {
  const router = Router();

  function signToken(user: { id: string; email: string }): string {
    return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  }

  router.post('/register', async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password || !name) { res.status(400).json({ error: 'Missing fields' }); return; }
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) { res.status(409).json({ error: 'Email already registered' }); return; }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({ data: { email, passwordHash, name } });
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

  router.get('/me', auth(prisma), async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: getUserId(req) } });
    if (!user) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ id: user.id, email: user.email, name: user.name, avatar: user.avatar });
  });

  router.patch('/profile', auth(prisma), async (req, res) => {
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

  router.patch('/password', auth(prisma), async (_req, res) => {
    res.status(403).json({ error: 'Password change is currently disabled' });
  });

  router.get('/settings', auth(prisma), async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: getUserId(req) },
        select: { openaiApiKey: true, doubaoApiKey: true, minimaxApiKey: true, llmProvider: true, llmApiKey: true, llmApiKeys: true, llmBaseUrl: true, llmModel: true },
      });
      if (!user) { res.status(404).json({ error: 'Not found' }); return; }

      const provider = normalizeLlmProvider(user.llmProvider);
      let llmApiKeys = parseLlmApiKeys(user.llmApiKeys);

      // Migration: migrate legacy single llmApiKey into per-provider map.
      if (Object.keys(llmApiKeys).length === 0 && user.llmApiKey) {
        llmApiKeys = { [provider]: user.llmApiKey };
        await prisma.user.update({
          where: { id: getUserId(req) },
          data: { llmApiKeys: serializeLlmApiKeys(llmApiKeys) },
        });
      }

      res.json({
        openaiApiKey: user.openaiApiKey ?? '',
        doubaoApiKey: user.doubaoApiKey ?? '',
        minimaxApiKey: user.minimaxApiKey ?? '',
        llmProvider: provider,
        llmApiKey: llmApiKeys[provider] ?? '',
        llmApiKeys,
        llmBaseUrl: user.llmBaseUrl ?? '',
        llmModel: user.llmModel ?? '',
      });
    } catch {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  router.patch('/settings', auth(prisma), async (req, res) => {
    try {
      const { openaiApiKey, doubaoApiKey, minimaxApiKey, llmProvider, llmApiKey, llmApiKeys, llmBaseUrl, llmModel } = req.body;
      const updateData: Record<string, string | null> = {};
      if (openaiApiKey !== undefined) updateData.openaiApiKey = openaiApiKey || null;
      if (doubaoApiKey !== undefined) updateData.doubaoApiKey = doubaoApiKey || null;
      if (minimaxApiKey !== undefined) updateData.minimaxApiKey = minimaxApiKey || null;
      if (llmProvider !== undefined) updateData.llmProvider = normalizeLlmProvider(llmProvider);
      if (llmBaseUrl !== undefined) updateData.llmBaseUrl = llmBaseUrl || null;
      if (llmModel !== undefined) updateData.llmModel = llmModel || null;

      // Always read the current row to merge llmApiKeys correctly.
      const existingUser = await prisma.user.findUnique({
        where: { id: getUserId(req) },
        select: { llmProvider: true, llmApiKey: true, llmApiKeys: true },
      });
      if (!existingUser) { res.status(404).json({ error: 'Not found' }); return; }

      const currentProvider = normalizeLlmProvider(existingUser.llmProvider);
      const targetProvider = typeof llmProvider === 'string' ? normalizeLlmProvider(llmProvider) : currentProvider;

      let currentKeys = parseLlmApiKeys(existingUser.llmApiKeys);
      // Migration safety: if the map is empty but the legacy field has a value, seed the map.
      if (Object.keys(currentKeys).length === 0 && existingUser.llmApiKey) {
        currentKeys = { [currentProvider]: existingUser.llmApiKey };
      }

      // Merge per-provider keys. Supports either the new llmApiKeys object or the legacy llmApiKey string.
      const mergedKeys: LlmApiKeys = { ...currentKeys };
      if (llmApiKeys !== undefined && typeof llmApiKeys === 'object' && llmApiKeys !== null) {
        for (const provider of SUPPORTED_LLM_PROVIDERS) {
          const value = (llmApiKeys as Record<string, unknown>)[provider];
          if (value === '') {
            delete mergedKeys[provider];
          } else if (typeof value === 'string') {
            mergedKeys[provider] = value;
          }
        }
      }
      if (llmApiKey !== undefined) {
        if (llmApiKey) {
          mergedKeys[targetProvider] = llmApiKey;
        } else {
          delete mergedKeys[targetProvider];
        }
      }

      updateData.llmApiKeys = serializeLlmApiKeys(mergedKeys);
      updateData.llmApiKey = mergedKeys[targetProvider] ?? null;

      const user = await prisma.user.update({
        where: { id: getUserId(req) },
        data: updateData,
        select: { openaiApiKey: true, doubaoApiKey: true, minimaxApiKey: true, llmProvider: true, llmApiKey: true, llmApiKeys: true, llmBaseUrl: true, llmModel: true },
      });
      const normalizedProvider = normalizeLlmProvider(user.llmProvider);
      const finalKeys = parseLlmApiKeys(user.llmApiKeys);
      res.json({
        openaiApiKey: user.openaiApiKey ?? '',
        doubaoApiKey: user.doubaoApiKey ?? '',
        minimaxApiKey: user.minimaxApiKey ?? '',
        llmProvider: normalizedProvider,
        llmApiKey: finalKeys[normalizedProvider] ?? '',
        llmApiKeys: finalKeys,
        llmBaseUrl: user.llmBaseUrl ?? '',
        llmModel: user.llmModel ?? '',
      });
    } catch {
      res.status(500).json({ error: 'Settings update failed' });
    }
  });

  return router;
}
