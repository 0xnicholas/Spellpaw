/**
 * Tests for the skill loader — fetches index.json + each MD, parses
 * frontmatter, caches in module-scope.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { ensureSkillsLoaded, getSkills, _resetSkillsLoader } from './loader';
import { installFetchStub } from './_testHelpers';

describe('skill loader', () => {
  beforeAll(() => {
    installFetchStub();
  });

  beforeEach(() => {
    _resetSkillsLoader();
  });

  it('loads 6 skills from public/skills/', async () => {
    await ensureSkillsLoaded();
    const skills = getSkills();
    expect(skills.length).toBe(6);
    const ids = skills.map((s) => s.id).sort();
    expect(ids).toEqual([
      'analyze-pacing',
      'batch-storyboard',
      'brainstorm-variants',
      'character-profile',
      'duplicate-project',
      'export-storyboard-pdf',
    ]);
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