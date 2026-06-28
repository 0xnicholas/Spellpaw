/**
 * Tests for drama-specific skill chat helpers. Loads the 6 fixture
 * skills via the shared loader stub, then exercises augmentUserMessage
 * / tryRunSkill / formatSkillInvocation against them.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { augmentUserMessage, tryRunSkill, formatSkillInvocation } from './skillAugment';
import { _resetSkillsLoader, ensureSkillsLoaded } from '@shared/copilot/skills/loader';
import { installFetchStub } from '@shared/copilot/skills/_testHelpers';

describe('augmentUserMessage (Phase 3 LLM-driven)', () => {
  beforeAll(() => {
    installFetchStub();
  });

  beforeEach(async () => {
    _resetSkillsLoader();
    await ensureSkillsLoaded();
  });

  it('returns text unchanged for non-slash input', () => {
    expect(augmentUserMessage('hello world', 'proj_1')).toBe('hello world');
  });

  it('returns text unchanged for unknown slash command', () => {
    expect(augmentUserMessage('/unknown-cmd arg', 'proj_1')).toBe('/unknown-cmd arg');
  });

  it('prepends skill instructions for known slash command', () => {
    const out = augmentUserMessage('/analyze-pacing', 'proj_1');
    expect(out).toContain('用户使用 /analyze-pacing');
    expect(out).toContain('当前项目：proj_1');
    expect(out).toContain('节奏分析');
    // Should also preserve the original raw input at the bottom
    expect(out).toContain('原始用户输入：/analyze-pacing');
  });

  it('renders parsed arg tokens as a list', () => {
    const out = augmentUserMessage('/duplicate-project 新标题:foo', 'proj_1');
    expect(out).toContain('用户提供的参数：');
    expect(out).toContain('- 新标题: foo');
  });

  it('includes skill MD body (instructions) in the output', () => {
    const out = augmentUserMessage('/analyze-pacing', 'proj_1');
    // analyze-pacing.md has "## 可用工具" section
    expect(out).toContain('可用工具');
  });

  it('handles empty projectId', () => {
    const out = augmentUserMessage('/analyze-pacing', '');
    expect(out).toContain('当前项目：（无）');
  });
});

describe('tryRunSkill', () => {
  beforeAll(() => {
    installFetchStub();
  });

  beforeEach(async () => {
    _resetSkillsLoader();
    await ensureSkillsLoaded();
  });

  it('returns a pending message for known slash command', () => {
    const r = tryRunSkill('/analyze-pacing', 'proj_1');
    expect(r).not.toBeNull();
    expect(r!.skillId).toBe('analyze-pacing');
    expect(r!.pendingMessage.role).toBe('agent');
    expect(r!.pendingMessage.content).toContain('节奏分析');
  });

  it('returns null for non-slash input', () => {
    expect(tryRunSkill('hello', 'proj_1')).toBeNull();
  });

  it('returns null for unknown slash command', () => {
    expect(tryRunSkill('/does-not-exist', 'proj_1')).toBeNull();
  });
});

describe('formatSkillInvocation', () => {
  beforeAll(() => {
    installFetchStub();
  });

  beforeEach(async () => {
    _resetSkillsLoader();
    await ensureSkillsLoaded();
  });

  it('formats known skill id with name + slash command', () => {
    expect(formatSkillInvocation('analyze-pacing')).toContain('节奏分析');
    expect(formatSkillInvocation('analyze-pacing')).toContain('/analyze-pacing');
  });

  it('falls back to id for unknown skill', () => {
    expect(formatSkillInvocation('unknown-skill')).toBe('🎯 unknown-skill');
  });
});