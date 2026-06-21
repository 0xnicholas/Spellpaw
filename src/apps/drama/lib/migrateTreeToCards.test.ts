import { describe, it, expect } from 'vitest';
import { migrateTreeToCards, isLegacyTree } from './migrateTreeToCards';
import type { TreeNode } from '@drama/types';

function makeTree(): TreeNode {
  return {
    id: 'root',
    type: 'project',
    title: '测试项目',
    status: 'draft',
    metadata: { description: '项目描述', createdAt: '', updatedAt: '' },
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
            metadata: { description: '开场', duration: 15, createdAt: '', updatedAt: '' },
            children: [
              {
                id: 'shot-1',
                type: 'shot',
                title: '镜头1',
                status: 'draft',
                metadata: { shotType: 'wide', createdAt: '', updatedAt: '' },
              },
            ],
          },
          {
            id: 'scene-2',
            type: 'scene',
            title: '场景2',
            status: 'in_progress',
            metadata: { description: '转折', duration: 30, createdAt: '', updatedAt: '' },
          },
        ],
      },
    ],
  };
}

describe('migrateTreeToCards', () => {
  it('converts a tree to canvas cards', () => {
    const tree = makeTree();
    const result = migrateTreeToCards(tree);
    // 1 root project + 1 act + 2 scenes = 4 cards
    expect(result.nodes).toHaveLength(4);
    expect(result.warnings).toHaveLength(0);
  });

  it('creates a root project card at origin', () => {
    const result = migrateTreeToCards(makeTree());
    const root = result.nodes[0];
    expect(root.type).toBe('storyline');
    expect(root.position).toEqual({ x: 0, y: 0 });
    expect(root.data.title).toBe('测试项目');
  });

  it('converts scene shots to children', () => {
    const result = migrateTreeToCards(makeTree());
    // 3rd card (index 2) is scene-1, which has 1 shot
    const scene1 = result.nodes[2];
    expect(scene1.data.title).toBe('场景1');
    expect(scene1.data.children).toHaveLength(1);
    expect(scene1.data.children![0].title).toBe('镜头1');
  });

  it('positions acts and scenes in columns/rows', () => {
    const result = migrateTreeToCards(makeTree());
    const act = result.nodes[1];
    const scene1 = result.nodes[2];
    const scene2 = result.nodes[3];

    // Act is in column 0
    expect(act.position.x).toBe(50);
    // Scene 1 starts in column 0
    expect(scene1.position.x).toBe(50);
    // Scene 2 is in same column, row 1
    expect(scene2.position.x).toBe(50);
    expect(scene2.position.y).toBeGreaterThan(scene1.position.y);
  });
});

describe('isLegacyTree', () => {
  it('detects legacy tree', () => {
    expect(isLegacyTree(makeTree())).toBe(true);
  });

  it('returns false for non-tree objects', () => {
    expect(isLegacyTree(null)).toBe(false);
    expect(isLegacyTree({})).toBe(false);
    expect(isLegacyTree({ type: 'scene' })).toBe(false);
  });
});
