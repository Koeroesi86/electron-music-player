import { describe, expect, it } from 'vitest';
import { getCoverUrl } from './cover-url';

describe('getCoverUrl', () => {
  it.each([
    ['cover-abc.jpg', 'cover-abc'],
    ['/data/albumart/cover-abc.png', 'cover-abc'],
    ['C:\\data\\albumart\\cover-abc.jpg', 'cover-abc'],
    ['no-extension', 'no-extension'],
  ])('points %s at its optimized copy', (picture, name) => {
    expect(getCoverUrl('3000', picture)).toBe(`http://127.0.0.1:3000/albumart/${name}-optimized.png`);
  });
});
