/**
 * Skill loader — fetches skill metadata from public/skills/ at runtime.
 *
 * Skills are now static MD files in `public/skills/`. At startup, we fetch
 * a manifest (`index.json`) to discover which skills exist, then load each
 * MD file and parse its YAML frontmatter. This means:
 *   - Zero TypeScript per skill
 *   - Hot-reload: edit an MD → refresh browser → skill updated
 *   - Build output: MD files copied to dist/skills/ by Vite
 *
 * The loaded skills are cached; `ensureSkillsLoaded()` must be called
 * before any lookup function. All lookup functions are async-safe.
 */
import { parseFrontmatter } from './frontmatter';
import type { Skill } from './types';

let _skills: Skill[] = [];
let _loaded = false;
let _loading: Promise<void> | null = null;
const _subscribers = new Set<() => void>();

function notify(): void {
  for (const fn of _subscribers) fn();
}

export async function loadSkills(): Promise<Skill[]> {
  if (_loaded) return _skills;

  const manifestResp = await fetch('/skills/index.json');
  if (!manifestResp.ok) {
    console.warn('[skill-loader] Failed to fetch manifest, skills unavailable');
    return [];
  }
  const manifest: { skills: string[] } = await manifestResp.json();

  const loaded: Skill[] = [];
  for (const id of manifest.skills) {
    try {
      const resp = await fetch(`/skills/${id}.md`);
      if (!resp.ok) {
        console.warn(`[skill-loader] Failed to fetch skill: ${id}`);
        continue;
      }
      const md = await resp.text();
      const { meta, body } = parseFrontmatter(md);
      const required = ['id', 'name', 'description', 'slashCommand'] as const;
      for (const key of required) {
        if (typeof meta[key] !== 'string' || !meta[key]) {
          console.warn(`[skill-loader] Skill "${id}" missing required field: ${key}`);
          continue; // skip malformed skill
        }
      }
      loaded.push({
        id: meta.id as string,
        name: meta.name as string,
        description: meta.description as string,
        slashCommand: meta.slashCommand as string,
        examples: (meta.examples as string[]) ?? [],
        parameters: {
          type: 'object',
          properties: (meta.parameters as Record<string, { type: string; description: string }>) ?? {},
          required: (meta.required as string[]) ?? [],
        },
        // Phase 3: stub invoke (kept for type compat; actual execution is LLM-driven)
        invoke: async () => ({
          summary: `Skill「${meta.name}」的完整执行由 LLM 驱动。请在对话中描述需求，AI 将按技能指导文档自动执行。`,
        }),
        instructions: body || undefined,
      });
    } catch (err) {
      console.warn(`[skill-loader] Error loading skill "${id}":`, err);
    }
  }

  _skills = Object.freeze(loaded) as Skill[];
  _loaded = true;
  return _skills;
}

/** Ensure skills are loaded. Safe to call multiple times — runs once. */
export async function ensureSkillsLoaded(): Promise<void> {
  if (_loaded) return;
  if (!_loading) {
    _loading = loadSkills()
      .then(() => {
        _loaded = true;
      })
      .finally(() => {
        _loading = null;
        notify();
      });
    // Notify synchronously so subscribers can flip isLoading=true before
    // the (possibly slow) fetch resolves.
    notify();
  }
  return _loading;
}

/** Synchronous read of already-loaded skills. Call ensureSkillsLoaded() first. */
export function getSkills(): readonly Skill[] {
  return _skills;
}

/** True while a load is in flight and not yet settled. Useful for UI
 *  loading-state rendering. Once a load settles (success or empty), this
 *  returns false even if the result is empty. */
export function isSkillsLoading(): boolean {
  return _loading !== null;
}

/**
 * Subscribe to skill-load lifecycle events. The callback fires whenever
 * `ensureSkillsLoaded` settles (success or empty result). Returns an
 * unsubscribe function.
 */
export function subscribeToSkills(fn: () => void): () => void {
  _subscribers.add(fn);
  return () => {
    _subscribers.delete(fn);
  };
}

/** Reset the loader (for tests). */
export function _resetSkillsLoader(): void {
  _skills = [];
  _loaded = false;
  _loading = null;
  _subscribers.clear();
}
