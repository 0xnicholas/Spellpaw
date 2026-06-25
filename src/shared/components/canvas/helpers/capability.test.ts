import { describe, it, expect } from 'vitest';
import { inferCapability } from './capability';

describe('inferCapability', () => {
  it('image no ref → text2image', () => {
    expect(inferCapability('image', false)).toBe('text2image');
  });
  it('image with ref → image2image', () => {
    expect(inferCapability('image', true)).toBe('image2image');
  });
  it('video no ref → text2video', () => {
    expect(inferCapability('video', false)).toBe('text2video');
  });
  it('video with ref → image2video', () => {
    expect(inferCapability('video', true)).toBe('image2video');
  });
  it('text throws', () => {
    expect(() => inferCapability('text', false)).toThrow();
  });
  it('upload throws', () => {
    expect(() => inferCapability('upload', false)).toThrow();
  });
});
