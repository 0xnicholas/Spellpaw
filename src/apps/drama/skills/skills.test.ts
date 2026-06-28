/**
 * Tests for the skill system — registry, slash-command parsing, and
 * the shared loader (Phase 3: skills loaded from public/skills/).
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  initSkills,
  getAllSkills,
  getSkillById,
  getSkillBySlashCommand,
  parseSlashCommand,
  parseArgTokens,
  skillToToolConfig,
  getAllSkillToolConfigs,
  _resetSkillsLoader,
} from './registry';
import { augmentUserMessage } from './chat';

// Serve the 6 MD files from the test fixture. In production these live
// in public/skills/ and are fetched via HTTP; in tests we stub fetch.
const SKILL_FIXTURES: Record<string, string> = {
  'analyze-pacing': `---
id: analyze-pacing
name: 节奏分析
description: 深入分析当前项目的节奏
slashCommand: analyze-pacing
examples: ["/analyze-pacing"]
parameters:
  focusArea:
    type: string
    description: 聚焦某段
required: []
---
Test body
`,
  'duplicate-project': `---
id: duplicate-project
name: 复制项目
description: 把当前项目结构复制为新项目
slashCommand: duplicate-project
examples: ["/duplicate-project 新标题:xxx"]
parameters:
  newTitle:
    type: string
    description: 新标题
required: ["newTitle"]
---
Test body
`,
  'batch-storyboard': `---
id: batch-storyboard
name: 批量生成分镜
description: 为画布上所有场景卡批量生成分镜图
slashCommand: batch-storyboard
examples: ["/batch-storyboard"]
parameters:
  stylePrompt:
    type: string
    description: 风格描述
  onlyEmpty:
    type: string
    description: 是否只处理空白
required: []
---
Test body
`,
  'character-profile': `---
id: character-profile
name: 创建角色卡
description: 从名字+简介创建一张 character 画布卡
slashCommand: character-profile
examples:
  - /character-profile 姓名:林小夏
  - /character-profile 姓名:顾言 年龄:28 职业:律师
parameters:
  姓名:
    type: string
    description: 角色姓名
  年龄:
    type: string
    description: 年龄
  职业:
    type: string
    description: 职业
  性格:
    type: string
    description: 性格
  描述:
    type: string
    description: 背景描述
required: ["姓名"]
---
Test body
`,
  'brainstorm-variants': `---
id: brainstorm-variants
name: 脑暴 3 个故事变体
description: 围绕一个主题生成 3 个不同角度的故事线卡片
slashCommand: brainstorm-variants
examples:
  - /brainstorm-variants 主题:时间旅行
parameters:
  主题:
    type: string
    description: 故事主题
required: ["主题"]
---
Test body
`,
  'export-storyboard-pdf': `---
id: export-storyboard-pdf
name: 导出分镜 PDF
description: 把当前项目导出为分镜 PDF
slashCommand: export-storyboard-pdf
examples: ["/export-storyboard-pdf"]
parameters:
required: []
---
Test body
`,
};

beforeAll(async () => {
  _resetSkillsLoader();
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const urlStr = String(url);
    if (urlStr === '/skills/index.json') {
      return new Response(JSON.stringify({ skills: Object.keys(SKILL_FIXTURES) }), { status: 200 });
    }
    const match = urlStr.match(/\/skills\/(.+)\.md$/);
    if (match) {
      const id = match[1];
      const md = SKILL_FIXTURES[id];
      if (md) return new Response(md, { status: 200 });
    }
    return new Response('Not found', { status: 404 });
  }));
  await initSkills();
});

describe('skill registry', () => {
  it('ships 6 built-in skills', () => {
    const skills = getAllSkills();
    expect(skills).toHaveLength(6);
    expect(skills.map((s) => s.id)).toEqual([
      'analyze-pacing',
      'duplicate-project',
      'batch-storyboard',
      'character-profile',
      'brainstorm-variants',
      'export-storyboard-pdf',
    ]);
  });

  it('looks up by id', () => {
    expect(getSkillById('analyze-pacing')).toBeDefined();
    expect(getSkillById('nope')).toBeUndefined();
  });

  it('looks up by slash command (with or without leading slash)', () => {
    expect(getSkillBySlashCommand('/analyze-pacing')).toBeDefined();
    expect(getSkillBySlashCommand('analyze-pacing')).toBeDefined();
    expect(getSkillBySlashCommand('unknown')).toBeUndefined();
  });

  it('parses slash command input', () => {
    const parsed = parseSlashCommand('/analyze-pacing 聚焦 clim');
    expect(parsed).not.toBeNull();
    expect(parsed!.skill.id).toBe('analyze-pacing');
    expect(parsed!.args).toBe('聚焦 clim');
  });

  it('parseSlashCommand returns null for non-slash input', () => {
    expect(parseSlashCommand('hello world')).toBeNull();
    expect(parseSlashCommand('/unknown-cmd')).toBeNull();
    expect(parseSlashCommand('')).toBeNull();
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
    const skill = getSkillById('analyze-pacing')!;
    const cfg = skillToToolConfig(skill);
    expect(cfg.name).toBe('spellpaw_skill_analyze-pacing');
    expect(cfg.description).toContain('节奏');
    // Top-level is always 'input' (LLM tool convention)
    expect(cfg.parameters.required).toEqual(['input']);
  });

  it('skillToToolConfig description is LLM-friendly (not raw JSON)', () => {
    const skill = getSkillById('character-profile')!;
    const cfg = skillToToolConfig(skill);
    expect(cfg.description).toMatch(/Slash command: \/character-profile/);
    expect(cfg.description).toMatch(/Examples: /);
    expect(cfg.description).toMatch(/Parameters:\n/);
    expect(cfg.description).toMatch(/-\s*姓名\*\s*\(string\):\s*角色姓名/);
    expect(cfg.description).toMatch(/-\s*年龄\s*\(string\):/);
    expect(cfg.description).toMatch(/-\s*职业\s*\(string\):/);
    expect(cfg.description).not.toMatch(/Schema:/);
    expect(cfg.description).not.toMatch(/\{"姓名":/);
  });

  it('skillToToolConfig handles skills with no parameters gracefully', () => {
    const skill = getSkillById('export-storyboard-pdf')!;
    const cfg = skillToToolConfig(skill);
    expect(cfg.description).toContain('No parameters.');
  });

  it('getAllSkillToolConfigs returns one config per skill', () => {
    const configs = getAllSkillToolConfigs();
    expect(configs).toHaveLength(6);
  });
});

// ── Phase 3: augmentUserMessage ─────────────────────────────────

describe('augmentUserMessage (Phase 3 LLM-driven)', () => {
  it('returns text unchanged for non-slash input', () => {
    const text = 'hello world';
    expect(augmentUserMessage(text, 'proj_1')).toBe(text);
  });

  it('returns text unchanged for unknown slash command', () => {
    const text = '/unknown-skill';
    expect(augmentUserMessage(text, 'proj_1')).toBe(text);
  });

  it('prepends skill instructions for known slash command', () => {
    const out = augmentUserMessage('/analyze-pacing 聚焦 clim', 'proj_1');
    expect(out).toContain('/analyze-pacing');
    expect(out).toContain('Skill 指导');
    expect(out).toContain('原始用户输入');
  });

  it('renders parsed arg tokens as a list', () => {
    const out = augmentUserMessage('/character-profile 姓名:林小夏 职业:咖啡师', 'proj_1');
    expect(out).toContain('姓名: 林小夏');
    expect(out).toContain('职业: 咖啡师');
  });

  it('includes skill MD body (instructions) in the output', () => {
    const out = augmentUserMessage('/analyze-pacing', 'proj_1');
    expect(out).toContain('Test body');
  });
});

// ── Phase 1: per-skill invoke tests are skipped ──────────────────
// Skills are now LLM-driven; the old TS invoke files have been deleted.
// These tests will be replaced by LLM-behavior tests when the system
// is integrated with a real LLM backend.
