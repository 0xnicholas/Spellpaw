import { describe, it, expect } from 'vitest';
import { kindToCardType, defaultTitle, inferKindFromCard } from './kindInference';

describe('kindToCardType', () => {
  it('maps text → storyline', () => {
    expect(kindToCardType('text')).toBe('storyline');
  });
  it('maps image → art', () => {
    expect(kindToCardType('image')).toBe('art');
  });
  it('maps video → videoClip', () => {
    expect(kindToCardType('video')).toBe('videoClip');
  });
  it('maps upload → asset', () => {
    expect(kindToCardType('upload')).toBe('asset');
  });
});

describe('defaultTitle', () => {
  it('text → 新文本', () => {
    expect(defaultTitle('text')).toBe('新文本');
  });
  it('image → 新美术', () => {
    expect(defaultTitle('image')).toBe('新美术');
  });
  it('video → 新视频', () => {
    expect(defaultTitle('video')).toBe('新视频');
  });
  it('upload → 新素材', () => {
    expect(defaultTitle('upload')).toBe('新素材');
  });
});

describe('inferKindFromCard', () => {
  it('storyline → text', () => {
    expect(inferKindFromCard({ type: 'storyline' } as never)).toBe('text');
  });
  it('script → text', () => {
    expect(inferKindFromCard({ type: 'script' } as never)).toBe('text');
  });
  it('art → image', () => {
    expect(inferKindFromCard({ type: 'art' } as never)).toBe('image');
  });
  it('videoClip → video', () => {
    expect(inferKindFromCard({ type: 'videoClip' } as never)).toBe('video');
  });
  it('asset → upload', () => {
    expect(inferKindFromCard({ type: 'asset' } as never)).toBe('upload');
  });
  it('unknown type → text (fallback)', () => {
    expect(inferKindFromCard({ type: 'unknown' } as never)).toBe('text');
  });
});
