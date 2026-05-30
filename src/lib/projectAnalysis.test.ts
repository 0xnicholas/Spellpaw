import { describe, it, expect } from 'vitest';
import { analyzePacing, suggestCompletions, generatePacingReport } from '../lib/projectAnalysis';
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

  it('detects high variance with coefficient of variation', () => {
    const tree: TreeNode = {
      id: 'root', type: 'project', title: 'Test', status: 'draft',
      metadata: { createdAt: '', updatedAt: '' },
      children: [
        {
          id: 'a1', type: 'act', title: 'A1', status: 'draft',
          children: [
            { id: 's1', type: 'scene', title: 'S1', status: 'draft', metadata: { duration: 5, createdAt: '', updatedAt: '' } },
            { id: 's2', type: 'scene', title: 'S2', status: 'draft', metadata: { duration: 50, createdAt: '', updatedAt: '' } },
            { id: 's3', type: 'scene', title: 'S3', status: 'draft', metadata: { duration: 8, createdAt: '', updatedAt: '' } },
          ],
        },
      ],
    };
    const issues = analyzePacing(tree);
    expect(issues.some(i => i.type === 'unbalanced' && i.message.includes('波动大'))).toBe(true);
  });

  it('detects front-heavy structure', () => {
    const tree: TreeNode = {
      id: 'root', type: 'project', title: 'Test', status: 'draft',
      metadata: { createdAt: '', updatedAt: '' },
      children: [
        { id: 'a1', type: 'act', title: 'A1', status: 'draft', children: [{ id: 's1', type: 'scene', title: 'S1', status: 'draft', metadata: { duration: 50, createdAt: '', updatedAt: '' } }] },
        { id: 'a2', type: 'act', title: 'A2', status: 'draft', children: [{ id: 's2', type: 'scene', title: 'S2', status: 'draft', metadata: { duration: 10, createdAt: '', updatedAt: '' } }] },
        { id: 'a3', type: 'act', title: 'A3', status: 'draft', children: [{ id: 's3', type: 'scene', title: 'S3', status: 'draft', metadata: { duration: 15, createdAt: '', updatedAt: '' } }] },
      ],
    };
    const issues = analyzePacing(tree);
    expect(issues.some(i => i.type === 'front_heavy')).toBe(true);
  });

  it('detects back-heavy structure', () => {
    const tree: TreeNode = {
      id: 'root', type: 'project', title: 'Test', status: 'draft',
      metadata: { createdAt: '', updatedAt: '' },
      children: [
        { id: 'a1', type: 'act', title: 'A1', status: 'draft', children: [{ id: 's1', type: 'scene', title: 'S1', status: 'draft', metadata: { duration: 10, createdAt: '', updatedAt: '' } }] },
        { id: 'a2', type: 'act', title: 'A2', status: 'draft', children: [{ id: 's2', type: 'scene', title: 'S2', status: 'draft', metadata: { duration: 10, createdAt: '', updatedAt: '' } }] },
        { id: 'a3', type: 'act', title: 'A3', status: 'draft', children: [{ id: 's3', type: 'scene', title: 'S3', status: 'draft', metadata: { duration: 50, createdAt: '', updatedAt: '' } }] },
      ],
    };
    const issues = analyzePacing(tree);
    expect(issues.some(i => i.type === 'back_heavy')).toBe(true);
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

describe('generatePacingReport', () => {
  it('returns comprehensive report with metrics', () => {
    const tree = makeTree();
    const report = generatePacingReport(tree);

    expect(report.totalDuration).toBe(95);
    expect(report.sceneCount).toBe(3);
    expect(report.actCount).toBe(2);
    expect(report.avgSceneDuration).toBeCloseTo(31.7, 0);
    expect(report.durationBars).toHaveLength(3);
    expect(report.issues.length).toBeGreaterThan(0);
    expect(report.suggestions.length).toBeGreaterThan(0);
  });

  it('marks overallStatus critical when multiple warnings', () => {
    const tree: TreeNode = {
      id: 'root', type: 'project', title: 'Test', status: 'draft',
      metadata: { createdAt: '', updatedAt: '' },
      children: [
        {
          id: 'a1', type: 'act', title: 'A1', status: 'draft',
          children: [
            { id: 's1', type: 'scene', title: 'S1', status: 'draft', metadata: { duration: 5, createdAt: '', updatedAt: '' } },
            { id: 's2', type: 'scene', title: 'S2', status: 'draft', metadata: { duration: 60, createdAt: '', updatedAt: '' } },
          ],
        },
        {
          id: 'a2', type: 'act', title: 'A2', status: 'draft',
          children: [
            { id: 's3', type: 'scene', title: 'S3', status: 'draft', metadata: { duration: 5, createdAt: '', updatedAt: '' } },
          ],
        },
      ],
    };
    const report = generatePacingReport(tree);
    expect(report.overallStatus).toBe('critical');
  });

  it('marks overallStatus good for balanced tree', () => {
    const tree: TreeNode = {
      id: 'root', type: 'project', title: 'Balanced', status: 'draft',
      metadata: { createdAt: '', updatedAt: '' },
      children: [
        {
          id: 'a1', type: 'act', title: 'A1', status: 'draft',
          children: [
            { id: 's1', type: 'scene', title: 'S1', status: 'draft', metadata: { duration: 20, createdAt: '', updatedAt: '' } },
            { id: 's2', type: 'scene', title: 'S2', status: 'draft', metadata: { duration: 22, createdAt: '', updatedAt: '' } },
          ],
        },
        {
          id: 'a2', type: 'act', title: 'A2', status: 'draft',
          children: [
            { id: 's3', type: 'scene', title: 'S3', status: 'draft', metadata: { duration: 18, createdAt: '', updatedAt: '' } },
          ],
        },
      ],
    };
    const report = generatePacingReport(tree);
    expect(report.overallStatus).toBe('good');
    expect(report.issues).toHaveLength(0);
  });

  it('returns empty bars for tree without scenes', () => {
    const tree: TreeNode = {
      id: 'root', type: 'project', title: 'Empty', status: 'draft',
      metadata: { createdAt: '', updatedAt: '' },
      children: [],
    };
    const report = generatePacingReport(tree);
    expect(report.durationBars).toHaveLength(0);
    expect(report.totalDuration).toBe(0);
  });
});
