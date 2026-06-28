/**
 * Tests for the skill registry — pure-function lookups, slash-command
 * parsing, arg-token parsing, and tool-config generation. Skills are
 * loaded once via the helper, then these tests run against the
 * in-memory cache.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { _resetSkillsLoader, ensureSkillsLoaded, getSkills } from './loader';
import {
  getSkillById,
  getSkillBySlashCommand,
  parseSlashCommand,
  parseArgTokens,
  skillToToolConfig,
  getAllSkillToolConfigs,
} from './registry';
import { installFetchStub, listFixtureIds } from './_testHelpers';

describe('skill registry', () => {
  beforeAll(() => {
    installFetchStub();
  });

  beforeEach(async () => {
    _resetSkillsLoader();
    await ensureSkillsLoaded();
  });

  it('ships all skills loaded from public/skills/', () => {
    const skills = getSkills();
    const expected = listFixtureIds();
    expect(skills).toHaveLength(expected.length);
    expect(skills.map((s) => s.id).sort()).toEqual(expected);
  });

  it('includes both the original 6 hand-written skills and migrated research skills', () => {
    const ids = getSkills().map((s) => s.id).sort();
    expect(ids).toContain('analyze-pacing');
    expect(ids).toContain('batch-storyboard');
    expect(ids).toContain('character-profile');
    // A sample of the migrated research skills:
    expect(ids).toContain('director-briefing');
    expect(ids).toContain('video-creator');
    expect(ids).toContain('storyboard-creator');
  });

  it('looks up by id', () => {
    expect(getSkillById(getSkills(), 'analyze-pacing')).toBeDefined();
    expect(getSkillById(getSkills(), 'nope')).toBeUndefined();
  });

  it('looks up by slash command (with or without leading slash)', () => {
    expect(getSkillBySlashCommand(getSkills(), '/analyze-pacing')).toBeDefined();
    expect(getSkillBySlashCommand(getSkills(), 'analyze-pacing')).toBeDefined();
    expect(getSkillBySlashCommand(getSkills(), 'unknown')).toBeUndefined();
  });

  it('parses slash command input', () => {
    const parsed = parseSlashCommand(getSkills(), '/analyze-pacing 聚焦 clim');
    expect(parsed).not.toBeNull();
    expect(parsed!.skill.id).toBe('analyze-pacing');
    expect(parsed!.args).toBe('聚焦 clim');
  });

  it('parseSlashCommand returns null for non-slash input', () => {
    expect(parseSlashCommand(getSkills(), 'hello world')).toBeNull();
    expect(parseSlashCommand(getSkills(), '/unknown-cmd')).toBeNull();
    expect(parseSlashCommand(getSkills(), '')).toBeNull();
  });

  it('parseArgTokens handles key:value tokens', () => {
    expect(parseArgTokens('新标题:foo 风格:bar')).toEqual({ '新标题': 'foo', '风格': 'bar' });
  });

  it('parseArgTokens ignores tokens without colon', () => {
    expect(parseArgTokens('no-colon-here')).toEqual({});
    expect(parseArgTokens('a:1 stray b:2')).toEqual({ a: '1', b: '2' });
  });

  it('parseArgTokens preserves whitespace inside double-quoted values', () => {
    expect(parseArgTokens('描述:"这是一个复杂的故事" 姓名:林小夏')).toEqual({
      描述: '这是一个复杂的故事',
      姓名: '林小夏',
    });
  });

  it('parseArgTokens preserves whitespace inside single-quoted values', () => {
    expect(parseArgTokens("name:'John Doe' age:30")).toEqual({
      name: 'John Doe',
      age: '30',
    });
  });

  it('parseArgTokens keeps quoted and unquoted values side by side', () => {
    expect(parseArgTokens('姓名:林 年龄:25 描述:"咖啡师 / 温柔 / 坚韧"')).toEqual({
      姓名: '林',
      年龄: '25',
      描述: '咖啡师 / 温柔 / 坚韧',
    });
  });

  it('skillToToolConfig generates spellpaw_skill_* prefixed config', () => {
    const skill = getSkillById(getSkills(), 'analyze-pacing')!;
    const cfg = skillToToolConfig(skill);
    expect(cfg.name).toBe('spellpaw_skill_analyze-pacing');
    expect(cfg.description).toContain('节奏');
    expect(cfg.parameters.required).toEqual(['input']);
  });

  it('skillToToolConfig description is LLM-friendly (not raw JSON)', () => {
    const skill = getSkillById(getSkills(), 'analyze-pacing')!;
    const cfg = skillToToolConfig(skill);
    // No raw JSON schema dump — should be a human-readable description
    expect(cfg.description).not.toContain('"type":"object"');
    // Parameters should be listed in human-readable form
    expect(cfg.description).toContain('focusArea');
  });

  it('skillToToolConfig handles skills with no parameters gracefully', () => {
    const skill = getSkillById(getSkills(), 'analyze-pacing')!;
    const cfg = skillToToolConfig(skill);
    expect(cfg.parameters.type).toBe('object');
    expect(cfg.parameters.properties.input).toBeDefined();
  });

  it('getAllSkillToolConfigs returns one config per skill', () => {
    const cfgs = getAllSkillToolConfigs(getSkills());
    expect(cfgs).toHaveLength(getSkills().length);
    expect(cfgs.every((c) => c.name.startsWith('spellpaw_skill_'))).toBe(true);
  });
});