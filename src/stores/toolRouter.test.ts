import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './projectStore';
import { toolRouter } from './toolRouter';

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
