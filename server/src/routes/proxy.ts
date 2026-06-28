/**
 * Provider proxy routes.
 *
 * Forwards image/video generation requests to OpenAI / Doubao so the front-end
 * doesn't need to make cross-origin calls with API keys from the browser.
 *
 * Endpoints:
 *   /api/v1/proxy/:provider/*
 *
 * The caller must provide the provider API key in the X-Provider-API-Key header.
 */
import { Router, type Request, type Response } from 'express';
import { auth, getUserId } from '../middleware.js';
import { logger } from '../lib/logger.js';

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  doubao: 'https://ark.cn-beijing.volces.com/api/v3',
  siliconflow: 'https://api.siliconflow.cn/v1',
};

function providerUrl(provider: string, wildcard: string): string | undefined {
  const base = PROVIDER_BASE_URLS[provider];
  if (!base) return undefined;
  const path = wildcard.startsWith('/') ? wildcard : `/${wildcard}`;
  return `${base}${path}`;
}

export function proxyRoutes(): Router {
  const router = Router();
  router.use(auth());

  router.all('/:provider/{*splat}', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const provider = req.params.provider as string;
    const rawSplat = req.params.splat;
    const wildcard = Array.isArray(rawSplat) ? rawSplat.join('/') : (rawSplat as string | undefined) ?? '';
    const targetUrl = providerUrl(provider, wildcard);
    if (!targetUrl) {
      res.status(400).json({ error: `Unknown provider: ${provider}` });
      return;
    }

    const authHeader = req.headers.authorization as string | undefined;
    const apiKey = (req.headers['x-provider-api-key'] as string | undefined) || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined);
    if (!apiKey) {
      res.status(400).json({ error: 'X-Provider-API-Key header or Authorization header required' });
      return;
    }

    const headers: Record<string, string> = {
      Authorization: authHeader ?? `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
      });

      const contentType = response.headers.get('content-type') || 'application/json';
      res.status(response.status);
      res.setHeader('Content-Type', contentType);

      // For non-JSON responses (e.g. binary), stream the body back.
      if (!contentType.includes('application/json')) {
        if (response.body) {
          const reader = response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
        }
        res.end();
        return;
      }

      const data = (await response.json()) as unknown;
      res.json(data);
    } catch (err) {
      logger.error(`[proxy] ${provider} ${wildcard} error:`, err);
      res.status(502).json({ error: `Proxy error: ${(err as Error).message}` });
    }
  });

  return router;
}
