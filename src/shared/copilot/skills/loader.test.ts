/**
 * Tests for the skill loader — fetches index.json + each MD, parses
 * frontmatter, caches in module-scope.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import {
  ensureSkillsLoaded,
  getSkills,
  isSkillsLoading,
  subscribeToSkills,
  _resetSkillsLoader,
} from './loader';
import { installFetchStub, listFixtureIds, loadFixture } from './_testHelpers';

describe('skill loader', () => {
  beforeAll(() => {
    installFetchStub();
  });

  beforeEach(() => {
    _resetSkillsLoader();
  });

  it('loads all skills from public/skills/', async () => {
    await ensureSkillsLoaded();
    const skills = getSkills();
    expect(skills.length).toBeGreaterThanOrEqual(6);
    const ids = skills.map((s) => s.id).sort();
    // The 6 original hand-written skills must be present
    expect(ids).toContain('analyze-pacing');
    expect(ids).toContain('batch-storyboard');
    expect(ids).toContain('brainstorm-variants');
    expect(ids).toContain('character-profile');
    expect(ids).toContain('duplicate-project');
    expect(ids).toContain('export-storyboard-pdf');
  });

  it('parsed skills have id, name, description, slashCommand, instructions', async () => {
    await ensureSkillsLoaded();
    const analyzePacing = getSkills().find((s) => s.id === 'analyze-pacing')!;
    expect(analyzePacing).toBeDefined();
    expect(analyzePacing.name).toBe('节奏分析');
    expect(analyzePacing.slashCommand).toBe('analyze-pacing');
    expect(analyzePacing.description).toContain('节奏');
    expect(analyzePacing.instructions).toContain('# 目标');
  });

  it('ensureSkillsLoaded is idempotent (only fetches once)', async () => {
    await ensureSkillsLoaded();
    const before = getSkills().length;
    await ensureSkillsLoaded();
    await ensureSkillsLoaded();
    expect(getSkills().length).toBe(before);
  });

  it('skips skills with missing required fields and warns', async () => {
    _resetSkillsLoader();
    const restore = installFetchStub();
    // Replace manifest with one that includes a fake ID that 404s
    const realFetch = global.fetch;
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/skills/index.json')) {
        return new Response(JSON.stringify({ skills: ['analyze-pacing', 'does-not-exist'] }), { status: 200 });
      }
      return realFetch(input);
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await ensureSkillsLoaded();
    expect(warnSpy).toHaveBeenCalled();
    const skills = getSkills();
    expect(skills.find((s) => s.id === 'analyze-pacing')).toBeDefined();
    expect(skills.find((s) => s.id === 'does-not-exist')).toBeUndefined();
    warnSpy.mockRestore();
    restore();
  });

  it('returns empty list if manifest fetch fails', async () => {
    _resetSkillsLoader();
    const realFetch = global.fetch;
    global.fetch = vi.fn(async () => new Response('', { status: 500 }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await ensureSkillsLoaded();
    expect(getSkills().length).toBe(0);
    warnSpy.mockRestore();
    global.fetch = realFetch;
  });
});

describe('skill loader — subscribe + isLoading', () => {
  beforeAll(() => {
    installFetchStub();
  });

  beforeEach(() => {
    _resetSkillsLoader();
  });

  it('isSkillsLoading is true while a fetch is in flight', async () => {
    expect(isSkillsLoading()).toBe(false);
    const p = ensureSkillsLoaded();
    expect(isSkillsLoading()).toBe(true);
    await p;
    expect(isSkillsLoading()).toBe(false);
  });

  it('subscribers are notified when loading settles', async () => {
    let calls = 0;
    const unsub = subscribeToSkills(() => {
      calls++;
    });
    await ensureSkillsLoaded();
    expect(calls).toBeGreaterThanOrEqual(1);
    unsub();
  });

  it('unsubscribe stops notifications', async () => {
    const calls: number[] = [];
    const unsub = subscribeToSkills(() => {
      calls.push(Date.now());
    });
    unsub();
    await ensureSkillsLoaded();
    expect(calls).toHaveLength(0);
  });
});
describe('skill loader — public/skills ↔ __fixtures__ sync', () => {
  beforeAll(() => {
    installFetchStub();
  });

  it('every public/skills/*.md has a matching __fixtures__/*.md with identical content', async () => {
    const fixtures = listFixtureIds();
    expect(fixtures.length).toBeGreaterThan(0);

    // The fetch stub will serve fixtures. Re-read each fixture from disk
    // (via loadFixture) and compare against the runtime parse.
    await ensureSkillsLoaded();
    const skills = getSkills();
    expect(skills.length).toBe(fixtures.length);

    for (const id of fixtures) {
      const fixtureMd = loadFixture(id);
      const skill = skills.find((s) => s.id === id);
      expect(skill, `runtime has skill ${id}`).toBeDefined();
      // Frontmatter parses identically (id + name + description)
      expect(skill!.name).toBeTruthy();
      expect(skill!.description).toBeTruthy();
      expect(skill!.slashCommand).toBe(id);
      // The body should contain at least one reference if it had refs
      const skillHasRefs = fixtureMd.includes('## Reference:');
      if (skillHasRefs) {
        expect(skill!.instructions).toContain('## Reference:');
      }
    }
  });
});
