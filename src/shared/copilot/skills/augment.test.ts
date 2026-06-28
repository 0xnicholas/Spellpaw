/**
 * Tests for the generic skill prompt builder. Loads the fixture skills
 * via the shared loader stub, then exercises buildSkillPrompt with
 * different contexts and tool hints.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { buildSkillPrompt, isSkillInvocation } from './augment';
import { _resetSkillsLoader, ensureSkillsLoaded } from './loader';
import { installFetchStub } from './_testHelpers';

describe('buildSkillPrompt (shared, app-agnostic)', () => {
  beforeAll(() => {
    installFetchStub();
  });

  beforeEach(async () => {
    _resetSkillsLoader();
    await ensureSkillsLoaded();
  });

  it('returns text unchanged for non-slash input', () => {
    expect(buildSkillPrompt('hello world', { contextLine: 'ctx' })).toBe('hello world');
  });

  it('returns text unchanged for unknown slash command', () => {
    expect(buildSkillPrompt('/does-not-exist', { contextLine: 'ctx' })).toBe(
      '/does-not-exist',
    );
  });

  it('wraps the user input with skill name + contextLine', () => {
    const out = buildSkillPrompt('/analyze-pacing', {
      contextLine: 'Portal User: alice',
    });
    expect(out).toContain('用户使用 /analyze-pacing');
    expect(out).toContain('Portal User: alice');
    expect(out).toContain('节奏分析');
    expect(out).toContain('原始用户输入：/analyze-pacing');
  });

  it('uses the caller-supplied toolHint when provided', () => {
    const out = buildSkillPrompt('/analyze-pacing', {
      contextLine: 'ctx',
      toolHint: 'CUSTOM HINT — please use the portal tools.',
    });
    expect(out).toContain('CUSTOM HINT');
    // Default hint should NOT appear when custom hint is supplied
    expect(out).not.toContain('可用的画布工具');
  });

  it('falls back to the default toolHint when none provided', () => {
    const out = buildSkillPrompt('/analyze-pacing', { contextLine: 'ctx' });
    expect(out).toContain('可用的画布工具');
  });

  it('renders parsed arg tokens as a list when present', () => {
    const out = buildSkillPrompt('/duplicate-project 新标题:foo', {
      contextLine: 'ctx',
    });
    expect(out).toContain('用户提供的参数：');
    expect(out).toContain('- 新标题: foo');
  });

  it('includes the skill MD body (instructions) in the output', () => {
    const out = buildSkillPrompt('/analyze-pacing', { contextLine: 'ctx' });
    expect(out).toContain('# 目标');
  });
});

describe('isSkillInvocation', () => {
  beforeAll(() => {
    installFetchStub();
  });

  beforeEach(async () => {
    _resetSkillsLoader();
    await ensureSkillsLoaded();
  });

  it('returns true for known slash commands', () => {
    expect(isSkillInvocation('/analyze-pacing')).toBe(true);
  });

  it('returns false for non-slash input', () => {
    expect(isSkillInvocation('hello')).toBe(false);
  });

  it('returns false for unknown slash command', () => {
    expect(isSkillInvocation('/unknown-skill')).toBe(false);
  });
});