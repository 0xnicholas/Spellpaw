import { describe, it, expect } from 'vitest';
import { findNode, findParent, getSiblings, collectScenes } from './treeUtils';
import type { TreeNode } from '@/types';

const tree: TreeNode = {
  id: 'root',
  type: 'project',
  title: 'Root',
  status: 'draft',
  children: [
    {
      id: 'a',
      type: 'act',
      title: 'Act 1',
      status: 'draft',
      children: [
        {
          id: 's1',
          type: 'scene',
          title: 'Scene 1',
          status: 'draft',
          metadata: { createdAt: '', updatedAt: '' },
        },
        {
          id: 's2',
          type: 'scene',
          title: 'Scene 2',
          status: 'draft',
          metadata: { createdAt: '', updatedAt: '' },
        },
      ],
    },
  ],
};

describe('findNode', () => {
  it('finds root node', () => {
    expect(findNode(tree, 'root')?.title).toBe('Root');
  });

  it('finds nested node', () => {
    expect(findNode(tree, 's1')?.title).toBe('Scene 1');
  });

  it('returns null for missing', () => {
    expect(findNode(tree, 'xxx')).toBeNull();
  });

  it('returns null for null root', () => {
    expect(findNode(null, 's1')).toBeNull();
  });
});

describe('findParent', () => {
  it('finds parent of nested node', () => {
    expect(findParent(tree, 's1')?.id).toBe('a');
  });

  it('returns null for root', () => {
    expect(findParent(tree, 'root')).toBeNull();
  });
});

describe('getSiblings', () => {
  it('returns sibling array including target', () => {
    expect(getSiblings(tree, 's1')).toHaveLength(2);
  });

  it('returns empty for root', () => {
    expect(getSiblings(tree, 'root')).toHaveLength(0);
  });
});

describe('collectScenes', () => {
  it('returns all scene nodes', () => {
    expect(collectScenes(tree)).toHaveLength(2);
  });

  it('returns empty when no scenes', () => {
    const t: TreeNode = { id: 'r', type: 'project', title: 'R', status: 'draft' };
    expect(collectScenes(t)).toHaveLength(0);
  });
});
