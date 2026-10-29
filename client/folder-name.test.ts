import { describe, expect, it } from 'vitest';
import { splitFolderPath } from './folder-name';

describe('splitFolderPath', () => {
  it.each([
    ['/home/me/Music/Jazz', 'Jazz', '/home/me/Music/'],
    ['/home/me/Music/Jazz/', 'Jazz', '/home/me/Music/'],
    ['C:\\Users\\me\\Music', 'Music', 'C:\\Users\\me\\'],
    ['/Music', 'Music', '/'],
  ])('splits %s', (path, name, parent) => {
    expect(splitFolderPath(path)).toEqual({ name, parent });
  });

  it('keeps a root as its own name', () => {
    expect(splitFolderPath('/')).toEqual({ name: '/', parent: '' });
  });
});
