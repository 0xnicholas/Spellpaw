/**
 * Tests for the skill system — registry, slash-command parsing, and
 * the 3 built-in skills.
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
  duplicateProjectSkill,
} from './builtIn';
import type { SkillContext } from './types';

function makeCtx(): SkillContext {
  return {
    projectId: 'proj_skill',
    getProjectTree: () => useProjectStore.getState().getCurrentTree(),
    getCanvasCardCount: () => useCanvasStore.getState().getCurrentNodes().length,
  };
}

describe('skill registry', () => {
  it('ships 3 built-in skills', () => {
    const skills = getAllSkills();
    expect(skills).toHaveLength(3);
    expect(skills.map((s) => s.id)).toEqual([
      'analyze-pacing',
      'duplicate-project',
      'batch-storyboard',
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

  it('skillToToolConfig generates spellpaw_skill_* prefixed config', () => {
    const cfg = skillToToolConfig(analyzePacingSkill);
    expect(cfg.name).toBe('spellpaw_skill_analyze-pacing');
    expect(cfg.description).toContain('节奏');
    expect(cfg.parameters.required).toEqual(['input']);
  });

  it('getAllSkillToolConfigs returns one config per skill', () => {
    const configs = getAllSkillToolConfigs();
    expect(configs).toHaveLength(BUILT_IN_SKILLS.length);
    expect(configs.map((c) => c.name)).toEqual([
      'spellpaw_skill_analyze-pacing',
      'spellpaw_skill_duplicate-project',
      'spellpaw_skill_batch-storyboard',
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
