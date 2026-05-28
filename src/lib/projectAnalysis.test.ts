import { describe, it, expect } from 'vitest';
import { analyzePacing, suggestCompletions } from '../lib/projectAnalysis';
import type { TreeNode } from '../types';

function makeTree(overrides?: Partial<TreeNode>): TreeNode {
  return {
    id: 'root', type: 'project', title: 'Test', status: 'draft',
    children: [
      {
        id: 'act-1', type: 'act', title: '第一幕', status: 'draft',
        children: [
          { id: 's1', type: 'scene', title: '场景1', status: 'draft', metadata: { duration: 15, createdAt: '', updatedAt: '' } },
          { id: 's2', type: 'scene', title: '场景2', status: 'draft', metadata: { duration: 20, createdAt: '', updatedAt: '' } },
        ],
      },
      {
        id: 'act-2', type: 'act', title: '第二幕', status: 'draft',
        children: [
          { id: 's3', type: 'scene', title: '场景3', status: 'draft', metadata: { duration: 60, createdAt: '', updatedAt: '' } },
        ],
      },
    ],
    metadata: { createdAt: '', updatedAt: '', duration: 95 },
    ...overrides,
  };
}

describe('analyzePacing', () => {
  it('detects scenes much longer than average', () => {
    const tree = makeTree();
    const issues = analyzePacing(tree);
    expect(issues.some(i => i.nodeId === 's3' && i.type === 'too_long')).toBe(true);
  });

  it('detects act imbalance', () => {
    const tree = makeTree({
      children: [
        { id: 'act-1', type: 'act', title: '第一幕', status: 'draft',
          children: [{ id: 's1', type: 'scene', title: 'S1', status: 'draft', metadata: { duration: 5, createdAt: '', updatedAt: '' } }] },
        { id: 'act-2', type: 'act', title: '第二幕', status: 'draft',
          children: [{ id: 's2', type: 'scene', title: 'S2', status: 'draft', metadata: { duration: 40, createdAt: '', updatedAt: '' } }] },
      ],
    } as Partial<TreeNode>);
    const issues = analyzePacing(tree);
    expect(issues.some(i => i.type === 'unbalanced')).toBe(true);
  });

  it('returns empty for balanced tree', () => {
    const tree = makeTree({
      children: [
        { id: 'a1', type: 'act', title: 'A1', status: 'draft',
          children: [{ id: 's1', type: 'scene', title: 'S1', status: 'draft', metadata: { duration: 20, createdAt: '', updatedAt: '' } }] },
        { id: 'a2', type: 'act', title: 'A2', status: 'draft',
          children: [{ id: 's2', type: 'scene', title: 'S2', status: 'draft', metadata: { duration: 25, createdAt: '', updatedAt: '' } }] },
      ],
    } as Partial<TreeNode>);
    const issues = analyzePacing(tree);
    expect(issues).toHaveLength(0);
  });
});

describe('suggestCompletions', () => {
  it('suggests adding acts for empty project', () => {
    const empty: TreeNode = { id: 'r', type: 'project', title: 'Empty', status: 'draft', children: [], metadata: { createdAt: '', updatedAt: '' } };
    const suggestions = suggestCompletions(empty);
    expect(suggestions.some(s => s.message.includes('尚未添加幕'))).toBe(true);
  });

  it('suggests minimum 3 acts', () => {
    const tree = makeTree();
    const suggestions = suggestCompletions(tree);
    expect(suggestions.some(s => s.message.includes('至少 3 幕'))).toBe(true);
  });

  it('suggests adding shots to scenes without them', () => {
    const tree = makeTree();
    const suggestions = suggestCompletions(tree);
    expect(suggestions.some(s => s.message.includes('没有镜头'))).toBe(true);
  });
});
