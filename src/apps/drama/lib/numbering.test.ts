import { describe, it, expect } from 'vitest';
import { computeDisplayNumbers } from './numbering';
import type { TreeNode, CanvasNode } from '@drama/types';

const sampleTree: TreeNode = {
  id: 'nd_root',
  type: 'project',
  title: 'Test Project',
  status: 'draft',
  expanded: true,
  metadata: { createdAt: '', updatedAt: '' },
  children: [
    {
      id: 'nd_act1',
      type: 'act',
      title: 'Act 1',
      status: 'draft',
      metadata: { createdAt: '', updatedAt: '' },
      children: [
        {
          id: 'nd_scene1',
          type: 'scene',
          title: 'Scene 1',
          status: 'draft',
          metadata: { createdAt: '', updatedAt: '' },
          children: [
            { id: 'nd_shot1', type: 'shot', title: 'Shot 1', status: 'draft', metadata: { createdAt: '', updatedAt: '' } },
            { id: 'nd_shot2', type: 'shot', title: 'Shot 2', status: 'draft', metadata: { createdAt: '', updatedAt: '' } },
          ],
        },
        {
          id: 'nd_scene2',
          type: 'scene',
          title: 'Scene 2',
          status: 'draft',
          metadata: { createdAt: '', updatedAt: '' },
        },
      ],
    },
    {
      id: 'nd_act2',
      type: 'act',
      title: 'Act 2',
      status: 'draft',
      metadata: { createdAt: '', updatedAt: '' },
      children: [
        {
          id: 'nd_scene3',
          type: 'scene',
          title: 'Scene 3',
          status: 'draft',
          metadata: { createdAt: '', updatedAt: '' },
        },
      ],
    },
  ],
};

describe('computeDisplayNumbers - tree nodes', () => {
  it('skips project root', () => {
    const map = computeDisplayNumbers(sampleTree, []);
    expect(map.get('nd_root')).toBeUndefined();
  });

  it('numbers acts sequentially from 1', () => {
    const map = computeDisplayNumbers(sampleTree, []);
    expect(map.get('nd_act1')).toBe('1');
    expect(map.get('nd_act2')).toBe('2');
  });

  it('numbers scenes with act prefix', () => {
    const map = computeDisplayNumbers(sampleTree, []);
    expect(map.get('nd_scene1')).toBe('1-1');
    expect(map.get('nd_scene2')).toBe('1-2');
    expect(map.get('nd_scene3')).toBe('2-1');
  });

  it('numbers shots with full path', () => {
    const map = computeDisplayNumbers(sampleTree, []);
    expect(map.get('nd_shot1')).toBe('1-1-1');
    expect(map.get('nd_shot2')).toBe('1-1-2');
  });
});

describe('computeDisplayNumbers - canvas cards (mounted)', () => {
  it('numbers mounted script cards', () => {
    const cards: CanvasNode[] = [
      { id: 'cv_s1', type: 'script', position: { x: 0, y: 0 }, data: { title: 'Script 1', linkedTreeNodeId: 'nd_scene1' } },
      { id: 'cv_s2', type: 'script', position: { x: 0, y: 0 }, data: { title: 'Script 2', linkedTreeNodeId: 'nd_scene1' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    expect(map.get('cv_s1')).toBe('1-1-S1');
    expect(map.get('cv_s2')).toBe('1-1-S2');
  });

  it('numbers mounted art cards', () => {
    const cards: CanvasNode[] = [
      { id: 'cv_a1', type: 'art', position: { x: 0, y: 0 }, data: { title: 'Art 1', linkedTreeNodeId: 'nd_scene1' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    expect(map.get('cv_a1')).toBe('1-1-A1');
  });

  it('numbers mounted character cards', () => {
    const cards: CanvasNode[] = [
      { id: 'cv_c1', type: 'character', position: { x: 0, y: 0 }, data: { title: 'Char 1', linkedTreeNodeId: 'nd_scene2' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    expect(map.get('cv_c1')).toBe('1-2-C1');
  });

  it('numbers deliverable cards by subtype', () => {
    const cards: CanvasNode[] = [
      { id: 'cv_d1', type: 'deliverable', position: { x: 0, y: 0 }, data: { title: 'Img 1', linkedTreeNodeId: 'nd_scene1', deliverableType: 'image' } },
      { id: 'cv_d2', type: 'deliverable', position: { x: 0, y: 0 }, data: { title: 'Vid 1', linkedTreeNodeId: 'nd_scene1', deliverableType: 'video' } },
      { id: 'cv_d3', type: 'deliverable', position: { x: 0, y: 0 }, data: { title: 'Aud 1', linkedTreeNodeId: 'nd_scene1', deliverableType: 'audio' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    expect(map.get('cv_d1')).toBe('1-1-D-img1');
    expect(map.get('cv_d2')).toBe('1-1-D-vid1');
    expect(map.get('cv_d3')).toBe('1-1-D-aud1');
  });

  it('counts separately per tree node + type group', () => {
    const cards: CanvasNode[] = [
      { id: 'cv_s1', type: 'script', position: { x: 0, y: 0 }, data: { title: 'S1', linkedTreeNodeId: 'nd_scene1' } },
      { id: 'cv_s2', type: 'script', position: { x: 0, y: 0 }, data: { title: 'S2', linkedTreeNodeId: 'nd_scene2' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    expect(map.get('cv_s1')).toBe('1-1-S1');
    expect(map.get('cv_s2')).toBe('1-2-S1');
  });
});

describe('computeDisplayNumbers - canvas cards (free)', () => {
  it('numbers cards without linkedTreeNodeId as free', () => {
    const cards: CanvasNode[] = [
      { id: 'cv_s1', type: 'script', position: { x: 0, y: 0 }, data: { title: 'Free Script' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    expect(map.get('cv_s1')).toBe('Free-S1');
  });

  it('numbers cards with dangling linkedTreeNodeId as free', () => {
    const cards: CanvasNode[] = [
      { id: 'cv_s1', type: 'script', position: { x: 0, y: 0 }, data: { title: 'Ghost', linkedTreeNodeId: 'nonexistent' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    expect(map.get('cv_s1')).toBe('Free-S1');
  });

  it('counts free cards per type globally', () => {
    const cards: CanvasNode[] = [
      { id: 'cv_s1', type: 'script', position: { x: 0, y: 0 }, data: { title: 'S1' } },
      { id: 'cv_s2', type: 'script', position: { x: 0, y: 0 }, data: { title: 'S2' } },
      { id: 'cv_a1', type: 'art', position: { x: 0, y: 0 }, data: { title: 'A1' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    expect(map.get('cv_s1')).toBe('Free-S1');
    expect(map.get('cv_s2')).toBe('Free-S2');
    expect(map.get('cv_a1')).toBe('Free-A1');
  });
});

describe('computeDisplayNumbers - edge cases', () => {
  it('returns empty map for null tree', () => {
    const map = computeDisplayNumbers(null, []);
    expect(map.size).toBe(0);
  });

  it('handles empty canvas nodes', () => {
    const map = computeDisplayNumbers(sampleTree, []);
    expect(map.get('nd_act1')).toBe('1');
    expect(map.get('nd_scene1')).toBe('1-1');
  });

  it('sorting is determined by canvas array index', () => {
    const cards: CanvasNode[] = [
      { id: 'cv_first', type: 'script', position: { x: 0, y: 0 }, data: { title: 'First', linkedTreeNodeId: 'nd_scene1' } },
      { id: 'cv_second', type: 'script', position: { x: 0, y: 0 }, data: { title: 'Second', linkedTreeNodeId: 'nd_scene1' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    expect(map.get('cv_first')).toBe('1-1-S1');
    expect(map.get('cv_second')).toBe('1-1-S2');
  });
});
