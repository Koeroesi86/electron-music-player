import { describe, expect, it } from 'vitest';
import toAddedFiles from './added-files';

const fileOf = (name: string, webkitRelativePath: string, lastModified = 1) => Object.assign(new File([''], name, { lastModified }), { webkitRelativePath });

describe('toAddedFiles', () => {
  it('keeps a dropped folder as it is', () => {
    const folder = fileOf('Music', '', 5);

    expect(toAddedFiles([folder], () => '/home/me/Music')).toEqual([{ name: 'Music', path: '/home/me/Music', lastModified: 5 }]);
  });

  it('collapses the files of a picked folder into the folder, once', () => {
    const files = [fileOf('a.flac', 'Music/a.flac'), fileOf('b.flac', 'Music/Album/b.flac')];
    const paths = new Map([
      [files[0], '/home/me/Music/a.flac'],
      [files[1], '/home/me/Music/Album/b.flac'],
    ]);

    expect(toAddedFiles(files, (file) => paths.get(file) ?? '', 9)).toEqual([{ name: 'Music', path: '/home/me/Music', lastModified: 9 }]);
  });

  it('works with Windows separators', () => {
    const file = fileOf('a.flac', 'Music/a.flac');

    expect(toAddedFiles([file], () => 'C:\\Users\\me\\Music\\a.flac', 9)).toEqual([{ name: 'Music', path: 'C:\\Users\\me\\Music', lastModified: 9 }]);
  });
});
