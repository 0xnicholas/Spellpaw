import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useProjectStore } from './projectStore';
import { useCanvasStore } from './canvasStore';
import { useCustomTemplateStore } from './customTemplateStore';
import { toolRouter } from './toolRouter';
import { providerRegistry, useTaskStore } from '@drama/lib/canvasToolkit';
import type { GenerationProvider } from '@drama/lib/canvasToolkit';
import type { NarrativeTemplate } from '@drama/types';

// 准备一棵测试树（project → act → scene → shot）
function seedTree(): string {
  const store = useProjectStore.getState();
  // 创建测试项目（会同时建立项目 + 树根节点）
  const projId = store.createProject('test-proj', '', '#6366f1');
  const rootNode = store.getCurrentTree()!;
  // 在树根下添加结构
  store.addTreeNode(rootNode.id, {
    id: 'act-1', type: 'act', title: '第一幕', status: 'draft',
    metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  });
  store.addTreeNode('act-1', {
    id: 'scene-1', type: 'scene', title: '场景 1', status: 'draft',
    metadata: { duration: 30, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  });
  store.addTreeNode('scene-1', {
    id: 'shot-1', type: 'shot', title: '镜头 1', status: 'draft',
    metadata: { duration: 5, shotType: 'wide', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  });
  return projId;
}

describe('toolRouter — 只读 tool', () => {
  beforeEach(() => {
    useProjectStore.setState({ trees: {}, currentProjectId: null, selectedNodeId: null });
  });

  it('get_tree 返回缩进文本，包含所有节点', async () => {
    seedTree();
    const result = await toolRouter.get_tree({ action: 'get_tree' });
    expect(result).toContain('├──');
    expect(result).toContain('第一幕');
    expect(result).toContain('场景 1');
    expect(result).toContain('镜头 1');
  });

  it('get_subtree 只返回指定节点子树', async () => {
    seedTree();
    const result = await toolRouter.get_subtree({ action: 'get_subtree', nodeId: 'scene-1' });
    expect(result).toContain('镜头 1');
    expect(result).not.toContain('第一幕'); // 父节点不应出现
  });

  it('get_tree 在空项目时返回提示', async () => {
    // 创建一个空项目（只有树根，无子节点）
    useProjectStore.getState().createProject('empty-proj', '', '#6366f1');
    const result = await toolRouter.get_tree({ action: 'get_tree' });
    // 空项目仍有根节点，但无 children
    expect(result).toContain('project');
  });
});

describe('toolRouter — 写入 tool', () => {
  beforeEach(() => {
    useProjectStore.setState({ trees: {}, currentProjectId: null, selectedNodeId: null });
  });

  it('add_node 创建节点并返回确认', async () => {
    seedTree();
    const result = await toolRouter.add_node({
      action: 'add_node', parentId: 'act-1', type: 'scene', title: '新场景'
    });
    expect(result).toMatch(/已添加 scene「新场景」/);

    const tree = useProjectStore.getState().getCurrentTree();
    const act1 = tree?.children?.[0];
    expect(act1?.children?.some(c => c.title === '新场景')).toBe(true);
  });

  it('add_node 注入默认元数据（createdAt, updatedAt, duration=0）', async () => {
    seedTree();
    await toolRouter.add_node({
      action: 'add_node', parentId: 'act-1', type: 'shot', title: '新镜头'
    });
    const tree = useProjectStore.getState().getCurrentTree();
    const act1 = tree?.children?.[0];
    const newShot = act1?.children?.find(c => c.title === '新镜头');
    expect(newShot?.metadata?.createdAt).toBeDefined();
    expect(newShot?.metadata?.duration).toBe(0);
  });

  it('update_node 修改标题并返回确认', async () => {
    seedTree();
    const result = await toolRouter.update_node({
      action: 'update_node', nodeId: 'scene-1', changes: { title: '修改后的场景' }
    });
    expect(result).toMatch(/已更新 scene-1/);

    const tree = useProjectStore.getState().getCurrentTree();
    const act1 = tree?.children?.[0];
    const scene = act1?.children?.[0];
    expect(scene?.title).toBe('修改后的场景');
  });

  it('update_node 修改元数据', async () => {
    seedTree();
    await toolRouter.update_node({
      action: 'update_node', nodeId: 'scene-1',
      changes: { metadata: { description: '新描述', duration: 45 } }
    });
    const tree = useProjectStore.getState().getCurrentTree();
    const scene = tree?.children?.[0]?.children?.[0];
    expect(scene?.metadata?.description).toBe('新描述');
    expect(scene?.metadata?.duration).toBe(45);
  });

  it('delete_node 删除节点并返回确认', async () => {
    seedTree();
    const result = await toolRouter.delete_node({ action: 'delete_node', nodeId: 'shot-1' });
    expect(result).toMatch(/已删除/);

    const tree = useProjectStore.getState().getCurrentTree();
    const scene1 = tree?.children?.[0]?.children?.[0];
    expect(scene1?.children?.length ?? 0).toBe(0);
  });

  it('move_node 调整顺序', async () => {
    seedTree();
    await toolRouter.add_node({ action: 'add_node', parentId: 'act-1', type: 'scene', title: '场景 2' });

    const result = await toolRouter.move_node({ action: 'move_node', nodeId: 'scene-1', newIndex: 1 });
    expect(result).toMatch(/已移动/);
  });

  it('add_canvas_card 创建画布卡片并关联树节点', async () => {
    seedTree();
    useCanvasStore.setState({ canvases: {} });

    const result = await toolRouter.add_canvas_card({
      action: 'add_canvas_card',
      cardType: 'script',
      data: {
        title: '场景 1 剧本卡',
        description: '第一场戏剧本',
        status: 'draft',
        linkedTreeNodeId: 'scene-1',
      },
    });

    expect(result).toContain('已创建 script 卡片');
    expect(result).toContain('场景 1 剧本卡');
    expect(result).toContain('scene-1');

    const nodes = useCanvasStore.getState().getCurrentNodes();
    expect(nodes.length).toBe(1);
    expect(nodes[0].type).toBe('script');
    expect(nodes[0].data.title).toBe('场景 1 剧本卡');
    expect(nodes[0].data.linkedTreeNodeId).toBe('scene-1');
  });

  it('add_canvas_card 支持指定 position', async () => {
    seedTree();
    useCanvasStore.setState({ canvases: {} });

    await toolRouter.add_canvas_card({
      action: 'add_canvas_card',
      cardType: 'character',
      data: { title: '角色 A' },
      position: { x: 500, y: 600 },
    });

    const nodes = useCanvasStore.getState().getCurrentNodes();
    expect(nodes[0].position).toEqual({ x: 500, y: 600 });
  });

  it('add_canvas_card 支持 sceneCard 类型', async () => {
    seedTree();
    useCanvasStore.setState({ canvases: {} });

    const result = await toolRouter.add_canvas_card({
      action: 'add_canvas_card',
      cardType: 'sceneCard',
      data: {
        title: '雨夜重逢',
        description: '男女主角在旧巷相遇',
        linkedTreeNodeId: 'scene-1',
      },
    });

    expect(result).toContain('已创建 sceneCard 卡片');

    const nodes = useCanvasStore.getState().getCurrentNodes();
    expect(nodes.length).toBe(1);
    expect(nodes[0].type).toBe('sceneCard');
    expect(nodes[0].data.title).toBe('雨夜重逢');
    expect(nodes[0].data.linkedTreeNodeId).toBe('scene-1');
  });

  it('add_canvas_card 自动从关联树节点填充 scene 元数据', async () => {
    seedTree();
    useProjectStore.getState().updateTreeNode('scene-1', {
      metadata: {
        duration: 45,
        location: '咖啡厅',
        timeOfDay: 'morning',
        shotType: 'close-up',
        cameraMovement: 'dolly',
        dialogue: '你好。',
        notes: '注意光影',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    useCanvasStore.setState({ canvases: {} });

    await toolRouter.add_canvas_card({
      action: 'add_canvas_card',
      cardType: 'script',
      data: { title: '场景 1 剧本卡', linkedTreeNodeId: 'scene-1' },
    });

    const scriptCard = useCanvasStore.getState().getCurrentNodes()[0];
    expect(scriptCard.data.duration).toBe(45);
    expect(scriptCard.data.location).toBe('咖啡厅');
    expect(scriptCard.data.timeOfDay).toBe('morning');
    expect(scriptCard.data.shotType).toBe('close-up');
    expect(scriptCard.data.cameraMovement).toBe('dolly');
    expect(scriptCard.data.dialogue).toBe('你好。');
    expect(scriptCard.data.notes).toBe('注意光影');
  });

  it('add_canvas_card 自动从关联树节点生成 sceneCard 的 tags 和 prompt', async () => {
    seedTree();
    useProjectStore.getState().updateTreeNode('scene-1', {
      metadata: {
        location: '旧巷',
        timeOfDay: 'night',
        shotType: 'medium',
        description: '男女主角相遇',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    useCanvasStore.setState({ canvases: {} });

    await toolRouter.add_canvas_card({
      action: 'add_canvas_card',
      cardType: 'sceneCard',
      data: { title: '雨夜重逢', linkedTreeNodeId: 'scene-1' },
    });

    const card = useCanvasStore.getState().getCurrentNodes()[0];
    expect(card.data.tags).toEqual(expect.arrayContaining(['旧巷', 'night', 'medium']));
    expect(card.data.generatedPrompt).toContain('场景 1');
    expect(card.data.generatedPrompt).toContain('旧巷');
    expect(card.data.generatedPrompt).toContain('男女主角相遇');
  });

  it('update_canvas_card 更新已有卡片', async () => {
    seedTree();
    useCanvasStore.setState({ canvases: {} });

    await toolRouter.add_canvas_card({
      action: 'add_canvas_card',
      cardType: 'script',
      data: { title: '旧标题', linkedTreeNodeId: 'scene-1' },
    });

    const cardId = useCanvasStore.getState().getCurrentNodes()[0].id;

    const result = await toolRouter.update_canvas_card({
      action: 'update_canvas_card',
      cardId,
      data: { title: '新标题', description: '更新后的描述', status: 'in_progress' },
    });

    expect(result).toContain('已更新画布卡片');

    const card = useCanvasStore.getState().getCurrentNodes()[0];
    expect(card.data.title).toBe('新标题');
    expect(card.data.description).toBe('更新后的描述');
    expect(card.data.status).toBe('in_progress');
  });

  it('update_canvas_card 对不存在的卡片报错', async () => {
    seedTree();
    useCanvasStore.setState({ canvases: {} });

    await expect(
      toolRouter.update_canvas_card({
        action: 'update_canvas_card',
        cardId: 'non-existent',
        data: { title: '新标题' },
      })
    ).rejects.toThrow(/未找到画布卡片/);
  });

  it('update_canvas_card 校验非法字段并拒绝', async () => {
    seedTree();
    useCanvasStore.setState({ canvases: {} });

    await toolRouter.add_canvas_card({
      action: 'add_canvas_card',
      cardType: 'script',
      data: { title: '剧本卡', linkedTreeNodeId: 'scene-1' },
    });

    const cardId = useCanvasStore.getState().getCurrentNodes()[0].id;

    await expect(
      toolRouter.update_canvas_card({
        action: 'update_canvas_card',
        cardId,
        data: { status: 'invalid_status' },
      })
    ).rejects.toThrow(/status 无效/);
  });

  it('update_canvas_card 部分更新时不覆盖未提供字段', async () => {
    seedTree();
    useCanvasStore.setState({ canvases: {} });

    await toolRouter.add_canvas_card({
      action: 'add_canvas_card',
      cardType: 'sceneCard',
      data: { title: '原场景卡', description: '原描述', linkedTreeNodeId: 'scene-1' },
    });

    const cardId = useCanvasStore.getState().getCurrentNodes()[0].id;

    await toolRouter.update_canvas_card({
      action: 'update_canvas_card',
      cardId,
      data: { description: '新描述' },
    });

    const card = useCanvasStore.getState().getCurrentNodes()[0];
    expect(card.data.title).toBe('原场景卡');
    expect(card.data.description).toBe('新描述');
  });

  it('delete_canvas_card 删除已有卡片', async () => {
    seedTree();
    useCanvasStore.setState({ canvases: {} });

    await toolRouter.add_canvas_card({
      action: 'add_canvas_card',
      cardType: 'character',
      data: { title: '角色 A' },
    });

    const cardId = useCanvasStore.getState().getCurrentNodes()[0].id;

    const result = await toolRouter.delete_canvas_card({
      action: 'delete_canvas_card',
      cardId,
    });

    expect(result).toContain('已删除画布卡片');
    expect(useCanvasStore.getState().getCurrentNodes().length).toBe(0);
  });

  it('delete_canvas_card 对不存在的卡片报错', async () => {
    seedTree();
    useCanvasStore.setState({ canvases: {} });

    await expect(
      toolRouter.delete_canvas_card({
        action: 'delete_canvas_card',
        cardId: 'non-existent',
      })
    ).rejects.toThrow(/未找到画布卡片/);
  });

  it('add_canvas_card 校验失败时抛出错误', async () => {
    seedTree();
    useCanvasStore.setState({ canvases: {} });

    await expect(
      toolRouter.add_canvas_card({
        action: 'add_canvas_card',
        cardType: 'script',
        data: { status: 'draft' },
      })
    ).rejects.toThrow(/title/);
  });
});

describe('toolRouter — AI 感知 tool', () => {
  beforeEach(() => {
    useProjectStore.setState({ trees: {}, currentProjectId: null, selectedNodeId: null });
  });

  it('analyze_structure 返回结构诊断文本', async () => {
    seedTree();
    const result = await toolRouter.analyze_structure({ action: 'analyze_structure' });
    expect(result).toContain('结构诊断');
    expect(result).toContain('1 幕');
    expect(result).toContain('1 场景');
    // Only 1 act, should suggest adding more acts
    expect(result).toContain('幕');
  });

  it('analyze_structure 在空项目时给出添加幕的建议', async () => {
    useProjectStore.getState().createProject('empty', '', '#000');
    const result = await toolRouter.analyze_structure({ action: 'analyze_structure' });
    expect(result).toContain('结构诊断');
    expect(result).toContain('尚未添加幕');
  });

  it('get_pacing_report 返回节奏分析文本', async () => {
    seedTree();
    const result = await toolRouter.get_pacing_report({ action: 'get_pacing_report' });
    expect(result).toContain('节奏分析');
    expect(result).toContain('场景');
  });

  it('get_pacing_report 在空项目时返回基本统计', async () => {
    useProjectStore.getState().createProject('empty2', '', '#000');
    const result = await toolRouter.get_pacing_report({ action: 'get_pacing_report' });
    expect(result).toContain('节奏分析');
    expect(result).toContain('0 场景');
  });

  it('match_template 返回模板匹配结果', async () => {
    seedTree();
    const result = await toolRouter.match_template({ action: 'match_template' });
    expect(result).toContain('模板匹配结果');
    // seedTree title is 'test-proj' with no genre keywords, so it returns "暂无明确匹配"
    expect(result).toContain('暂无明确匹配');
  });

  it('optimize_pacing 在空项目时返回提示', async () => {
    useProjectStore.getState().createProject('empty3', '', '#000');
    const result = await toolRouter.optimize_pacing({ action: 'optimize_pacing' });
    expect(result).toContain('无法优化');
  });

  it('optimize_pacing dryRun 返回预览方案', async () => {
    seedTree();
    const result = await toolRouter.optimize_pacing({ action: 'optimize_pacing' });
    // seedTree has 1 scene with 30s duration — single scene means no imbalance issues,
    // so it should say "无需调整" or return a plan
    expect(result).toMatch(/无需调整|优化方案|已优化/);
  });
});

describe('toolRouter — generate_storyboard', () => {
  beforeEach(() => {
    useProjectStore.setState({ trees: {}, currentProjectId: null, selectedNodeId: null });
    useCanvasStore.setState({ canvases: {}, selectedCardId: null });
    providerRegistry.clear();
  });

  function fakeProvider(opts: {
    id: string;
    name?: string;
    configured?: boolean;
    resultUrl?: string;
    async?: boolean;
  }): GenerationProvider {
    const id = opts.id;
    return {
      id,
      name: opts.name ?? id,
      supportedMedia: ['image'],
      capabilities: ['text2image'],
      requiredConfigKeys: [`${id}Key`],
      isConfigured: () => opts.configured ?? true,
      configure: () => {},
      estimateCost: () => ({ amount: 1, unit: 'image' }),
      submit: async () =>
        opts.async
          ? { taskId: `${id}_task`, status: 'pending' }
          : { taskId: `${id}_task`, status: 'done', resultUrl: opts.resultUrl ?? `https://${id}.example/img.png` },
      poll: async (taskId) => ({
        taskId,
        status: 'done',
        resultUrl: opts.resultUrl ?? `https://${id}.example/img.png`,
      }),
    };
  }

  it('国产 provider 优先，默认使用 doubao', async () => {
    seedTree();
    providerRegistry.register(fakeProvider({ id: 'doubao', name: '豆包' }));
    providerRegistry.register(fakeProvider({ id: 'siliconflow', name: '硅基流动' }));
    providerRegistry.register(fakeProvider({ id: 'openai', name: 'OpenAI' }));
    providerRegistry.register(fakeProvider({ id: 'mock', name: 'Mock' }));

    const result = await toolRouter.generate_storyboard({
      action: 'generate_storyboard',
      nodeId: 'scene-1',
    });

    expect(result).toContain('豆包');
    const nodes = useCanvasStore.getState().getCurrentNodes();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].data.sourceProvider).toBe('doubao');
    expect(nodes[0].data.thumbnail).toContain('doubao.example');
  });

  it('doubao 未配置时 fallback 到另一家国产 siliconflow', async () => {
    seedTree();
    providerRegistry.register(fakeProvider({ id: 'doubao', configured: false }));
    providerRegistry.register(fakeProvider({ id: 'siliconflow', name: '硅基流动' }));

    const result = await toolRouter.generate_storyboard({
      action: 'generate_storyboard',
      nodeId: 'scene-1',
    });

    expect(result).toContain('硅基流动');
    expect(useCanvasStore.getState().getCurrentNodes()[0].data.sourceProvider).toBe('siliconflow');
  });

  it('国产 provider 都未配置时 fallback 到 openai', async () => {
    seedTree();
    providerRegistry.register(fakeProvider({ id: 'doubao', configured: false }));
    providerRegistry.register(fakeProvider({ id: 'siliconflow', configured: false }));
    providerRegistry.register(fakeProvider({ id: 'openai', name: 'OpenAI' }));

    const result = await toolRouter.generate_storyboard({
      action: 'generate_storyboard',
      nodeId: 'scene-1',
    });

    expect(result).toContain('OpenAI');
    expect(useCanvasStore.getState().getCurrentNodes()[0].data.sourceProvider).toBe('openai');
  });

  it('doubao/siliconflow/openai 都未配置时 fallback 到 mock', async () => {
    seedTree();
    providerRegistry.register(fakeProvider({ id: 'doubao', configured: false }));
    providerRegistry.register(fakeProvider({ id: 'siliconflow', configured: false }));
    providerRegistry.register(fakeProvider({ id: 'openai', configured: false }));
    providerRegistry.register(fakeProvider({ id: 'mock', name: 'Mock' }));

    const result = await toolRouter.generate_storyboard({
      action: 'generate_storyboard',
      nodeId: 'scene-1',
    });

    expect(result).toContain('Mock');
    expect(useCanvasStore.getState().getCurrentNodes()[0].data.sourceProvider).toBe('mock');
  });

  it('异步任务会写入 taskStore 并启动轮询', async () => {
    seedTree();
    providerRegistry.register(fakeProvider({ id: 'doubao', async: true }));

    const result = await toolRouter.generate_storyboard({
      action: 'generate_storyboard',
      nodeId: 'scene-1',
    });

    expect(result).toContain('提交');
    expect(result).toContain('doubao_task');
    const nodes = useCanvasStore.getState().getCurrentNodes();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].data.thumbnail).toBeUndefined();

    const tasks = useTaskStore.getState().tasks;
    expect(tasks).toHaveLength(1);
    expect(tasks[0].providerId).toBe('doubao');
  });

  it('stylePrompt 会覆盖默认 prompt 并写入 tags', async () => {
    seedTree();
    providerRegistry.register(fakeProvider({ id: 'doubao' }));

    await toolRouter.generate_storyboard({
      action: 'generate_storyboard',
      nodeId: 'scene-1',
      stylePrompt: 'A cinematic noir style with high contrast.',
    });

    const card = useCanvasStore.getState().getCurrentNodes()[0];
    expect(card.data.generatedPrompt).toContain('A cinematic noir style');
    expect(card.data.tags).toEqual(['A cinematic noir style with high contrast.']);
  });

  it('customPrompt 覆盖默认 prompt', async () => {
    seedTree();
    providerRegistry.register(fakeProvider({ id: 'doubao' }));

    await toolRouter.generate_storyboard({
      action: 'generate_storyboard',
      nodeId: 'scene-1',
      prompt: 'Custom cinematic frame.',
    });

    const card = useCanvasStore.getState().getCurrentNodes()[0];
    expect(card.data.generatedPrompt).toBe('Custom cinematic frame.');
  });

  it('没有可用 provider 时抛出错误', async () => {
    seedTree();
    // providerRegistry is cleared in beforeEach; mock provider is always configured,
    // so we intentionally register nothing to simulate total misconfiguration.
    await expect(
      toolRouter.generate_storyboard({
        action: 'generate_storyboard',
        nodeId: 'scene-1',
      })
    ).rejects.toThrow(/没有已配置的 provider/);
  });

  it('所有候选 provider 提交失败时抛出错误', async () => {
    seedTree();
    providerRegistry.register(fakeProvider({ id: 'doubao', configured: false }));
    providerRegistry.register(fakeProvider({ id: 'siliconflow', configured: false }));
    providerRegistry.register(fakeProvider({ id: 'openai', configured: false }));
    // mock is always configured, so this scenario actually cannot happen in practice.
    // We simulate by registering a failing mock provider that reports configured but fails submit.
    providerRegistry.register({
      ...fakeProvider({ id: 'mock', configured: true }),
      submit: async () => ({ taskId: '', status: 'failed', error: 'mock failure' }),
    });

    await expect(
      toolRouter.generate_storyboard({
        action: 'generate_storyboard',
        nodeId: 'scene-1',
      })
    ).rejects.toThrow(/mock failure/);
  });
});

describe('toolRouter — apply_template / kickstart_project', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    useProjectStore.setState({ trees: {}, currentProjectId: null, selectedNodeId: null });
    useCanvasStore.setState({ canvases: {}, selectedCardId: null });
    useCustomTemplateStore.setState({ templates: [] });

    // Allow apply_template to resolve built-in templates from the public dir in tests.
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.startsWith('/templates/') && url.endsWith('.spellpaw-template.json')) {
        return new Response(JSON.stringify(makeTestTemplate()), { status: 200 });
      }
      return originalFetch(url);
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeTestTemplate(): NarrativeTemplate {
    return {
      id: 'test-suspense',
      name: '测试悬疑',
      category: 'suspense',
      description: '用于测试的悬疑模板',
      targetDuration: 60,
      targetPlatform: 'portrait',
      version: 1,
      tags: ['test'],
      stylePresets: {
        colorPalette: ['#000'],
        pacing: 'fast',
        visualStyle: 'noir',
      },
      structure: {
        acts: [
          {
            title: '第一幕',
            description: '开端',
            scenes: [
              {
                title: '日常场景',
                description: '主角日常生活',
                metadata: { duration: 15 },
              },
              {
                title: '异常发生',
                description: '发现异常',
                metadata: { duration: 15 },
                children: [
                  { title: '特写镜头', description: '细节特写', metadata: { duration: 5 } },
                ],
              },
            ],
          },
        ],
      },
    };
  }

  it('apply_template 将模板 scene 创建为 scene 节点（而非 shot）', async () => {
    useProjectStore.getState().createProject('test-proj', '', '#6366f1');
    useCustomTemplateStore.getState().addTemplate(makeTestTemplate());

    const result = await toolRouter.apply_template({
      action: 'apply_template',
      templateId: 'test-suspense',
    });

    expect(result).toContain('测试悬疑');

    const tree = useProjectStore.getState().getCurrentTree();
    const acts = tree?.children ?? [];
    expect(acts).toHaveLength(1);

    const scenes = acts[0]?.children ?? [];
    expect(scenes).toHaveLength(2);
    expect(scenes[0]?.type).toBe('scene');
    expect(scenes[1]?.type).toBe('scene');

    // Nested children of a scene should be shots.
    const shots = scenes[1]?.children ?? [];
    expect(shots).toHaveLength(1);
    expect(shots[0]?.type).toBe('shot');
  });

  it('kickstart_project 会创建场景并生成 sceneCard', async () => {
    useProjectStore.getState().createProject('kickstart-proj', '', '#6366f1');
    useCustomTemplateStore.getState().addTemplate(makeTestTemplate());

    const result = await toolRouter.kickstart_project({
      action: 'kickstart_project',
      theme: '测试主题',
      genre: 'suspense',
    });

    expect(result).toContain('2 个场景');
    expect(result).toContain('2 张场景卡');

    const tree = useProjectStore.getState().getCurrentTree();
    const scenes = tree?.children?.[0]?.children ?? [];
    expect(scenes.length).toBe(2);

    const cards = useCanvasStore.getState().getCurrentNodes();
    expect(cards.length).toBe(2);
    expect(cards[0].type).toBe('sceneCard');
    expect(cards[0].data.linkedTreeNodeId).toBe(scenes[0].id);
  });
});
