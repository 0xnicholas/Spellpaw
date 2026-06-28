/**
 * Shared test helpers for the skill system. Loaded by both
 * `loader.test.ts` and any future tests that need skill fixtures.
 *
 * Skills are fetched from `/skills/index.json` + `/skills/{id}.md` in
 * production (served from public/skills/). In tests we stub `fetch` and
 * serve the canonical MD files from `__fixtures__/` (which mirror the
 * contents of public/skills/).
 */
import fs from 'node:fs';
import path from 'node:path';
import { vi } from 'vitest';

const FIXTURE_DIR = path.resolve(__dirname, '__fixtures__');

export function loadFixture(skillId: string): string {
  return fs.readFileSync(path.join(FIXTURE_DIR, `${skillId}.md`), 'utf-8');
}

export function listFixtureIds(): string[] {
  return fs
    .readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
    .sort();
}

/**
 * Install a `fetch` stub that serves the in-repo MD fixtures. Returns
 * a `restore` function. Use inside `beforeEach` to keep tests isolated.
 */
export function installFetchStub(): () => void {
  const realFetch = global.fetch;
  const fixtures = listFixtureIds();
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.endsWith('/skills/index.json')) {
      return new Response(JSON.stringify({ skills: fixtures }), { status: 200 });
    }
    const match = url.match(/\/skills\/([^/]+)\.md$/);
    if (match && fixtures.includes(match[1]!)) {
      return new Response(loadFixture(match[1]!), { status: 200 });
    }
    return new Response('', { status: 404 });
  }) as unknown as typeof fetch;

  return () => {
    global.fetch = realFetch;
  };
}