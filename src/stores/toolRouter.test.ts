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
