/**
 * Tests for the skill system — registry, slash-command parsing, and
 * the 6 built-in skills.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import {
  getAllSkills,
  getSkillById,
  getSkillBySlashCommand,
  parseSlashCommand,
  parseArgTokens,
  skillToToolConfig,
  getAllSkillToolConfigs,
} from './registry';
import {
  BUILT_IN_SKILLS,
  analyzePacingSkill,
  batchStoryboardSkill,
  brainstormVariantsSkill,
  characterProfileSkill,
  duplicateProjectSkill,
  exportStoryboardPdfSkill,
} from './builtIn';
import { exportStoryboardPDF } from '@drama/lib/exportPDF';
import type { SkillContext } from './types';

// Mock the PDF export so the test doesn't try to build a real PDF and
// we can assert it was called with the right project + tree.
vi.mock('@drama/lib/exportPDF', () => ({
  exportStoryboardPDF: vi.fn(),
}));

function makeCtx(): SkillContext {
  return {
    projectId: 'proj_skill',
    getProjectTree: () => useProjectStore.getState().getCurrentTree(),
    getCurrentProject: () => {
      const { projects, currentProjectId } = useProjectStore.getState();
      return projects.find((p) => p.id === currentProjectId) ?? null;
    },
    getCanvasCardCount: () => useCanvasStore.getState().getCurrentNodes().length,
  };
}

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
    expect(getSkillById('analyze-pacing')).toBe(analyzePacingSkill);
    expect(getSkillById('nope')).toBeUndefined();
  });

  it('looks up by slash command (with or without leading slash)', () => {
    expect(getSkillBySlashCommand('/analyze-pacing')).toBe(analyzePacingSkill);
    expect(getSkillBySlashCommand('analyze-pacing')).toBe(analyzePacingSkill);
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
    expect(parseArgTokens('新标题:foo 风格:bar')).toEqual({
      '新标题': 'foo',
      '风格': 'bar',
    });
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
    const cfg = skillToToolConfig(analyzePacingSkill);
    expect(cfg.name).toBe('spellpaw_skill_analyze-pacing');
    expect(cfg.description).toContain('节奏');
    expect(cfg.parameters.required).toEqual(['input']);
  });

  it('skillToToolConfig description is LLM-friendly (not raw JSON)', () => {
    // character-profile has 5 params with one required (姓名)
    const cfg = skillToToolConfig(characterProfileSkill);

    // Description structure: description + slash command + examples + param list
    expect(cfg.description).toMatch(/Slash command: \/character-profile/);
    expect(cfg.description).toMatch(/Examples: /);
    expect(cfg.description).toMatch(/Parameters:\n/);

    // Each parameter rendered as a bullet line; required marked with *
    expect(cfg.description).toMatch(/-\s*姓名\*\s*\(string\):\s*角色姓名/);
    expect(cfg.description).toMatch(/-\s*年龄\s*\(string\):/);
    expect(cfg.description).toMatch(/-\s*职业\s*\(string\):/);

    // Crucially: no raw JSON.stringify artifact
    expect(cfg.description).not.toMatch(/Schema:/);
    expect(cfg.description).not.toMatch(/\{"姓名":/);
  });

  it('skillToToolConfig handles skills with no parameters gracefully', () => {
    const cfg = skillToToolConfig(exportStoryboardPdfSkill);
    expect(cfg.description).toContain('No parameters.');
  });

  it('getAllSkillToolConfigs returns one config per skill', () => {
    const configs = getAllSkillToolConfigs();
    expect(configs).toHaveLength(BUILT_IN_SKILLS.length);
    expect(configs.map((c) => c.name)).toEqual([
      'spellpaw_skill_analyze-pacing',
      'spellpaw_skill_duplicate-project',
      'spellpaw_skill_batch-storyboard',
      'spellpaw_skill_character-profile',
      'spellpaw_skill_brainstorm-variants',
      'spellpaw_skill_export-storyboard-pdf',
    ]);
  });
});

describe('analyze-pacing skill', () => {
  beforeEach(() => {
    useProjectStore.setState({ trees: {}, currentProjectId: null, selectedNodeId: null, projects: [] });
    useCanvasStore.setState({ canvases: {}, selectedCardId: null });
    // Mock fetch to prevent actual API calls
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  });

  it('handles empty project gracefully', async () => {
    useProjectStore.getState().createProject('empty', '', '#000');
    const result = await analyzePacingSkill.invoke({}, makeCtx());
    // The skill should still produce a valid diagnostic, not crash.
    expect(result.summary).toContain('结构诊断');
    expect(result.summary).toContain('0 幕');
  });

  it('returns composite report on a real project', async () => {
    useProjectStore.getState().createProject('p', '', '#000');
    // Add some tree content so analyze_structure has something to work with
    const root = useProjectStore.getState().getCurrentTree()!;
    useProjectStore.getState().addTreeNode(root.id, {
      id: 'a1', type: 'act', title: '第一幕', status: 'draft',
      metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    });
    useProjectStore.getState().addTreeNode('a1', {
      id: 's1', type: 'scene', title: '开场', status: 'draft',
      metadata: { duration: 30, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    });

    const result = await analyzePacingSkill.invoke({ focusArea: 'first_act' }, makeCtx());
    expect(result.summary).toContain('结构诊断');
    expect(result.summary).toContain('节奏分析');
    expect(result.summary).toContain('聚焦');
    expect(result.needsLlmFollowup).toBe(true);
  });
});

describe('duplicate-project skill', () => {
  beforeEach(() => {
    useProjectStore.setState({ trees: {}, currentProjectId: null, selectedNodeId: null, projects: [] });
    useCanvasStore.setState({ canvases: {}, selectedCardId: null });
  });

  it('refuses missing title', async () => {
    useProjectStore.getState().createProject('p', '', '#000');
    const result = await duplicateProjectSkill.invoke({}, makeCtx());
    expect(result.summary).toContain('请提供');
  });

  it('creates empty project when source has no acts', async () => {
    useProjectStore.getState().createProject('p', '', '#000');
    const result = await duplicateProjectSkill.invoke({ newTitle: 'v2' }, makeCtx());
    expect(result.summary).toContain('v2');
    expect(result.summary).toContain('原项目无幕');
  });

  it('duplicates acts and scenes', async () => {
    useProjectStore.getState().createProject('原版', '', '#000');
    const root = useProjectStore.getState().getCurrentTree()!;
    useProjectStore.getState().addTreeNode(root.id, {
      id: 'a1', type: 'act', title: '第一幕', status: 'draft',
      metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    });
    useProjectStore.getState().addTreeNode('a1', {
      id: 's1', type: 'scene', title: '场景 1', status: 'draft',
      metadata: { duration: 30, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    });

    const result = await duplicateProjectSkill.invoke({ newTitle: 'v2' }, makeCtx());
    expect(result.summary).toContain('v2');
    expect(result.summary).toContain('1 幕');
    expect(result.summary).toContain('1 场景');

    // The new project should be set as current
    expect(useProjectStore.getState().currentProjectId).toContain('proj_');
  });
});

describe('batch-storyboard skill', () => {
  beforeEach(() => {
    useProjectStore.setState({ trees: {}, currentProjectId: null, selectedNodeId: null, projects: [] });
    useCanvasStore.setState({ canvases: {}, selectedCardId: null });
    // Mock fetch to prevent actual image generation
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  });

  it('reports empty canvas clearly', async () => {
    useProjectStore.getState().createProject('p', '', '#000');
    const result = await batchStoryboardSkill.invoke({}, makeCtx());
    expect(result.summary).toContain('没有任何场景卡');
  });

  it('onlyEmpty=true skips cards with thumbnails', async () => {
    useProjectStore.getState().createProject('p', '', '#000');
    const pid = useProjectStore.getState().currentProjectId!;
    // Manually add two scene cards
    useCanvasStore.setState({
      canvases: {
        [pid]: {
          nodes: [
            { id: 'c1', type: 'sceneCard', position: { x: 0, y: 0 }, data: { title: '已生成', status: 'draft', thumbnail: 'data:img' } },
            { id: 'c2', type: 'sceneCard', position: { x: 0, y: 0 }, data: { title: '未生成', status: 'draft' } },
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
      selectedCardId: null,
    });

    const result = await batchStoryboardSkill.invoke({ onlyEmpty: 'true' }, makeCtx());
    // Will call generate_storyboard once for c2
    expect(result.summary).toMatch(/1\/\d+/);
  });
});

describe('character-profile skill', () => {
  beforeEach(() => {
    useProjectStore.setState({ trees: {}, currentProjectId: null, selectedNodeId: null, projects: [] });
    useCanvasStore.setState({ canvases: {}, selectedCardId: null });
  });

  it('requires a name', async () => {
    useProjectStore.getState().createProject('p', '', '#000');
    const result = await characterProfileSkill.invoke({}, makeCtx());
    expect(result.summary).toContain('请提供角色姓名');
  });

  it('creates a character card with all provided fields', async () => {
    useProjectStore.getState().createProject('p', '', '#000');
    const pid = useProjectStore.getState().currentProjectId!;
    const result = await characterProfileSkill.invoke(
      { 姓名: '林小夏', 年龄: '25', 职业: '咖啡师', 性格: '温柔坚韧' },
      makeCtx()
    );
    expect(result.summary).toContain('林小夏');
    expect(result.summary).toContain('咖啡师');
    expect(result.cardsCreated).toBe(1);

    const cards = useCanvasStore.getState().canvases[pid].nodes;
    expect(cards).toHaveLength(1);
    expect(cards[0].type).toBe('character');
    expect((cards[0].data as { title: string }).title).toBe('林小夏');
  });

  it('uses placeholders for missing fields', async () => {
    useProjectStore.getState().createProject('p', '', '#000');
    const pid = useProjectStore.getState().currentProjectId!;
    const result = await characterProfileSkill.invoke({ 姓名: '顾言' }, makeCtx());
    expect(result.summary).toContain('顾言');
    expect(result.summary).toContain('未知');

    const cards = useCanvasStore.getState().canvases[pid].nodes;
    // role/age/personality are encoded into description + tags (the
    // character card schema doesn't allow them as top-level fields)
    expect((cards[0].data as { description: string }).description).toContain('未知');
    expect((cards[0].data as { tags: string[] }).tags).toContain('未知');
  });
});

describe('brainstorm-variants skill', () => {
  beforeEach(() => {
    useProjectStore.setState({ trees: {}, currentProjectId: null, selectedNodeId: null, projects: [] });
    useCanvasStore.setState({ canvases: {}, selectedCardId: null });
  });

  it('requires a theme', async () => {
    useProjectStore.getState().createProject('p', '', '#000');
    const result = await brainstormVariantsSkill.invoke({}, makeCtx());
    expect(result.summary).toContain('请提供主题');
  });

  it('creates 3 storyline cards with different angles', async () => {
    useProjectStore.getState().createProject('p', '', '#000');
    const pid = useProjectStore.getState().currentProjectId!;
    const result = await brainstormVariantsSkill.invoke(
      { 主题: '时间旅行' },
      makeCtx()
    );
    expect(result.cardsCreated).toBe(3);
    expect(result.summary).toContain('时间旅行');
    expect(result.summary).toContain('喜剧反差');
    expect(result.summary).toContain('悬疑反转');
    expect(result.summary).toContain('温情治愈');

    const cards = useCanvasStore.getState().canvases[pid].nodes;
    expect(cards).toHaveLength(3);
    expect(cards.every((c) => c.type === 'storyline')).toBe(true);
  });
});

describe('export-storyboard-pdf skill', () => {
  beforeEach(() => {
    useProjectStore.setState({ trees: {}, currentProjectId: null, selectedNodeId: null, projects: [] });
    vi.mocked(exportStoryboardPDF).mockClear();
  });

  it('refuses to export when no project is open', async () => {
    const result = await exportStoryboardPdfSkill.invoke({}, makeCtx());
    expect(result.summary).toMatch(/当前没有打开的项目/);
    expect(exportStoryboardPDF).not.toHaveBeenCalled();
  });

  it('still exports an empty project (just produces a minimal PDF with title only)', async () => {
    useProjectStore.getState().createProject('空项目', '', '#000');
    const result = await exportStoryboardPdfSkill.invoke({}, makeCtx());
    expect(result.summary).toContain('空项目');
    expect(exportStoryboardPDF).toHaveBeenCalledTimes(1);
  });

  it('calls exportStoryboardPDF with the current project + tree', async () => {
    useProjectStore.getState().createProject('密室逃脱', '', '#6366f1');
    const root = useProjectStore.getState().getCurrentTree()!;
    useProjectStore.getState().addTreeNode(root.id, {
      id: 'a1', type: 'act', title: '第一幕', status: 'draft',
      metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    });

    const result = await exportStoryboardPdfSkill.invoke({}, makeCtx());
    expect(result.summary).toContain('密室逃脱');
    expect(exportStoryboardPDF).toHaveBeenCalledTimes(1);
    const [project, tree] = vi.mocked(exportStoryboardPDF).mock.calls[0];
    expect(project.title).toBe('密室逃脱');
    expect(tree.id).toBe(root.id);
  });
});
