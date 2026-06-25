import { describe, it, expect } from 'vitest';
import { migrateCopilotCards, countCopilotCards, type LegacyNodeLike } from './migrateCopilotCards';

function makeCopilotNode(
  kind: string,
  status: string,
  result?: { url: string }
): LegacyNodeLike {
  return {
    id: `copilot_${kind}_${status}`,
    type: 'copilotCard',
    position: { x: 0, y: 0 },
    data: {
      title: '',
      kind,
      status,
      prompt: 'a cat',
      providerId: 'mock',
      ...(result ? { result } : {}),
    },
  };
}

describe('migrateCopilotCards — image kind', () => {
  it('done + result → art card with thumbnail', () => {
    const input = [makeCopilotNode('image', 'done', { url: 'http://img.png' })];
    const out = migrateCopilotCards(input);
    expect(out[0].type).toBe('art');
    expect(out[0].data.thumbnail).toBe('http://img.png');
    expect(out[0].data.generatedPrompt).toBe('a cat');
    expect(out[0].data.isPlaceholder).toBe(false);
  });
  it('generating → art placeholder', () => {
    const out = migrateCopilotCards([makeCopilotNode('image', 'generating')]);
    expect(out[0].type).toBe('art');
    expect(out[0].data.isPlaceholder).toBe(true);
    expect(out[0].data.thumbnail).toBeUndefined();
  });
  it('idle → art placeholder', () => {
    const out = migrateCopilotCards([makeCopilotNode('image', 'idle')]);
    expect(out[0].type).toBe('art');
    expect(out[0].data.isPlaceholder).toBe(true);
  });
});

describe('migrateCopilotCards — video kind', () => {
  it('done → videoClip', () => {
    const out = migrateCopilotCards([makeCopilotNode('video', 'done', { url: 'http://v.mp4' })]);
    expect(out[0].type).toBe('videoClip');
  });
});

describe('migrateCopilotCards — text kind', () => {
  it('done → storyline', () => {
    const out = migrateCopilotCards([makeCopilotNode('text', 'done', { url: '' })]);
    expect(out[0].type).toBe('storyline');
  });
});

describe('migrateCopilotCards — upload kind', () => {
  it('done → asset', () => {
    const out = migrateCopilotCards([makeCopilotNode('upload', 'done', { url: 'data:...' })]);
    expect(out[0].type).toBe('asset');
  });
});

describe('migrateCopilotCards — pass-through', () => {
  it('non-copilotCard node passes through unchanged', () => {
    const story: LegacyNodeLike = {
      id: 'story_1',
      type: 'storyline',
      position: { x: 0, y: 0 },
      data: { title: 'existing story' },
    };
    const out = migrateCopilotCards([story]);
    expect(out[0]).toBe(story);
  });
});

describe('migrateCopilotCards — fallback', () => {
  it('undefined kind → storyline (fallback)', () => {
    const node: LegacyNodeLike = {
      id: 'c1',
      type: 'copilotCard',
      position: { x: 0, y: 0 },
      data: { kind: undefined, status: 'idle' },
    };
    const out = migrateCopilotCards([node]);
    expect(out[0].type).toBe('storyline');
  });
});

describe('countCopilotCards', () => {
  it('counts only copilotCard nodes', () => {
    const nodes: LegacyNodeLike[] = [
      makeCopilotNode('image', 'idle'),
      makeCopilotNode('video', 'done'),
      { id: 's1', type: 'storyline', position: { x: 0, y: 0 }, data: { title: 'x' } },
    ];
    expect(countCopilotCards(nodes)).toBe(2);
  });
  it('empty array → 0', () => {
    expect(countCopilotCards([])).toBe(0);
  });
});