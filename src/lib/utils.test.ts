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
