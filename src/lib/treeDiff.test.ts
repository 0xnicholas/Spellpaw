import { describe, it, expect } from 'vitest';
import { diffTrees, diffCanvasNodes, formatDiffValue, diffDisplayLabel, type NodeDiff } from './treeDiff';
import type { TreeNode, CanvasNode } from '@/types';

function makeTree(overrides?: Partial<TreeNode>): TreeNode {
  return {
    id: 'root',
    type: 'project',
    title: 'Test Project',
    status: 'draft',
    metadata: { createdAt: '', updatedAt: '' },
    children: [
      {
        id: 'act-1',
        type: 'act',
        title: '第一幕',
        status: 'draft',
        metadata: { createdAt: '', updatedAt: '' },
        children: [
          {
            id: 'scene-1',
            type: 'scene',
            title: '场景1',
            status: 'draft',
            metadata: { duration: 15, description: '开场', createdAt: '', updatedAt: '' },
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('diffTrees', () => {
  it('returns empty when trees are identical', () => {
    const tree = makeTree();
    const result = diffTrees(tree, JSON.parse(JSON.stringify(tree)));
    expect(result.nodeDiffs).toHaveLength(0);
  });

  it('detects added nodes in remote', () => {
    const local = makeTree();
    const remote = makeTree({
      children: [
        {
          id: 'act-1',
          type: 'act',
          title: '第一幕',
          status: 'draft',
          metadata: { createdAt: '', updatedAt: '' },
          children: [
            {
              id: 'scene-1',
              type: 'scene',
              title: '场景1',
              status: 'draft',
              metadata: { duration: 15, description: '开场', createdAt: '', updatedAt: '' },
            },
            {
              id: 'scene-2',
              type: 'scene',
              title: '场景2',
              status: 'draft',
              metadata: { duration: 20, createdAt: '', updatedAt: '' },
            },
          ],
        },
      ],
    });
    const result = diffTrees(local, remote);
    expect(result.nodeDiffs.some((d) => d.type === 'added' && d.nodeId === 'scene-2')).toBe(true);
  });

  it('detects removed nodes in remote', () => {
    const local = makeTree();
    const remote = makeTree({ children: [] });
    const result = diffTrees(local, remote);
    expect(result.nodeDiffs.some((d) => d.type === 'removed' && d.nodeId === 'act-1')).toBe(true);
    expect(result.nodeDiffs.some((d) => d.type === 'removed' && d.nodeId === 'scene-1')).toBe(true);
  });

  it('detects title changes', () => {
    const local = makeTree();
    const remote = makeTree({
      children: [
        {
          id: 'act-1',
          type: 'act',
          title: '第一幕改名',
          status: 'draft',
          metadata: { createdAt: '', updatedAt: '' },
          children: [
            {
              id: 'scene-1',
              type: 'scene',
              title: '场景1',
              status: 'draft',
              metadata: { duration: 15, description: '开场', createdAt: '', updatedAt: '' },
            },
          ],
        },
      ],
    });
    const result = diffTrees(local, remote);
    expect(result.nodeDiffs.some((d) => d.type === 'modified' && d.field === 'title' && d.nodeId === 'act-1')).toBe(true);
  });

  it('detects metadata changes', () => {
    const local = makeTree();
    const remote = makeTree({
      children: [
        {
          id: 'act-1',
          type: 'act',
          title: '第一幕',
          status: 'draft',
          metadata: { createdAt: '', updatedAt: '' },
          children: [
            {
              id: 'scene-1',
              type: 'scene',
              title: '场景1',
              status: 'draft',
              metadata: { duration: 30, description: '开场改', createdAt: '', updatedAt: '' },
            },
          ],
        },
      ],
    });
    const result = diffTrees(local, remote);
    expect(result.nodeDiffs.some((d) => d.type === 'modified' && d.field === 'duration')).toBe(true);
    expect(result.nodeDiffs.some((d) => d.type === 'modified' && d.field === 'description')).toBe(true);
  });

  it('detects status changes', () => {
    const local = makeTree();
    const remote = makeTree({
      children: [
        {
          id: 'act-1',
          type: 'act',
          title: '第一幕',
          status: 'in_progress',
          metadata: { createdAt: '', updatedAt: '' },
          children: [
            {
              id: 'scene-1',
              type: 'scene',
              title: '场景1',
              status: 'draft',
              metadata: { duration: 15, description: '开场', createdAt: '', updatedAt: '' },
            },
          ],
        },
      ],
    });
    const result = diffTrees(local, remote);
    expect(result.nodeDiffs.some((d) => d.type === 'modified' && d.field === 'status' && d.nodeId === 'act-1')).toBe(true);
  });

  it('counts correctly', () => {
    const local = makeTree();
    const remote = makeTree({ children: [] });
    const result = diffTrees(local, remote);
    expect(result.localOnlyCount).toBe(2); // act-1, scene-1
    expect(result.remoteOnlyCount).toBe(0);
  });
});

describe('diffCanvasNodes', () => {
  it('detects added canvas nodes', () => {
    const local: CanvasNode[] = [];
    const remote: CanvasNode[] = [
      { id: 'n1', type: 'sceneCard', position: { x: 0, y: 0 }, data: { title: 'Scene 1' } },
    ];
    const result = diffCanvasNodes(local, remote);
    expect(result.addedNodes).toHaveLength(1);
    expect(result.removedNodes).toHaveLength(0);
  });

  it('detects removed canvas nodes', () => {
    const local: CanvasNode[] = [
      { id: 'n1', type: 'sceneCard', position: { x: 0, y: 0 }, data: { title: 'Scene 1' } },
    ];
    const remote: CanvasNode[] = [];
    const result = diffCanvasNodes(local, remote);
    expect(result.addedNodes).toHaveLength(0);
    expect(result.removedNodes).toHaveLength(1);
  });

  it('detects modified canvas nodes', () => {
    const local: CanvasNode[] = [
      { id: 'n1', type: 'sceneCard', position: { x: 0, y: 0 }, data: { title: 'Old' } },
    ];
    const remote: CanvasNode[] = [
      { id: 'n1', type: 'sceneCard', position: { x: 0, y: 0 }, data: { title: 'New' } },
    ];
    const result = diffCanvasNodes(local, remote);
    expect(result.modifiedNodes).toHaveLength(1);
  });
});

describe('formatDiffValue', () => {
  it('formats various types', () => {
    expect(formatDiffValue(null)).toBe('(空)');
    expect(formatDiffValue(undefined)).toBe('(空)');
    expect(formatDiffValue('')).toBe('(空)');
    expect(formatDiffValue(true)).toBe('是');
    expect(formatDiffValue(false)).toBe('否');
    expect(formatDiffValue(42)).toBe('42');
    expect(formatDiffValue('hello')).toBe('hello');
    expect(formatDiffValue('a'.repeat(100))).toContain('…');
  });
});

describe('diffDisplayLabel', () => {
  it('labels added diff', () => {
    const diff: NodeDiff = {
      nodeId: 'x', type: 'added', field: 'node', localValue: null, remoteValue: {},
      localTitle: '(新增)', remoteTitle: '新场景', nodeType: 'scene', path: [],
    };
    expect(diffDisplayLabel(diff)).toContain('新增');
    expect(diffDisplayLabel(diff)).toContain('新场景');
  });

  it('labels removed diff', () => {
    const diff: NodeDiff = {
      nodeId: 'x', type: 'removed', field: 'node', localValue: {}, remoteValue: null,
      localTitle: '旧场景', remoteTitle: '(已删除)', nodeType: 'scene', path: [],
    };
    expect(diffDisplayLabel(diff)).toContain('删除');
    expect(diffDisplayLabel(diff)).toContain('旧场景');
  });
});
