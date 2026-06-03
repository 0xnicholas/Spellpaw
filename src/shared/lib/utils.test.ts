import { describe, it, expect } from 'vitest';
import { cn, formatBytes, formatDate, generateId } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('handles conditional classes', () => {
    // eslint-disable-next-line no-constant-binary-expression
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });

  it('resolves tailwind conflicts', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(2516582)).toBe('2.4 MB');
  });
});

describe('formatDate', () => {
  it('formats ISO date', () => {
    expect(formatDate('2026-05-19T10:30:00Z')).toBe('2026-05-19');
  });
});

describe('generateId', () => {
  it('generates id with prefix', () => {
    const id = generateId('test_');
    expect(id.startsWith('test_')).toBe(true);
  });

  it('generates unique ids', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});

describe('generateId with length param', () => {
  it('generates id with custom prefix and default length', () => {
    const id = generateId('nd_');
    expect(id).toMatch(/^nd_[a-z0-9]+_[a-z0-9]{5}$/);
  });

  it('generates id with custom prefix and custom random length', () => {
    const id = generateId('cv_', 10);
    expect(id).toMatch(/^cv_[a-z0-9]+_[a-z0-9]{10}$/);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId('test_', 8)));
    expect(ids.size).toBe(100);
  });

  it('preserves backward compatibility - no length param', () => {
    const id = generateId('old_');
    expect(id).toMatch(/^old_[a-z0-9]+_[a-z0-9]{5}$/);
  });
});
