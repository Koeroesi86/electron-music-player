import { describe, expect, it } from 'vitest';
import type { Folder } from '../types/library';
import {
  cycleSort,
  knownFolders,
  parseAlbumSort,
  parseFolders,
  parseTrackSort,
  restoreAlbumSort,
  restoreTrackSort,
  trackSortFields,
} from '../types/library-query';
import type { TrackSort } from '../types/library-query';
import reducers from './redux/reducers';
import { selectAlbumQuery, selectedFolders, selectTrackQuery } from './library-query';

const folder = (path: string): Folder => ({ path, lastModified: 1 });

describe('cycleSort', () => {
  it('goes ascending, descending and back to the default order on a column', () => {
    const ascending = cycleSort<TrackSort['field']>(undefined, 'title');
    const descending = cycleSort(ascending, 'title');

    expect(ascending).toEqual({ field: 'title', direction: 'asc' });
    expect(descending).toEqual({ field: 'title', direction: 'desc' });
    expect(cycleSort(descending, 'title')).toBeUndefined();
  });

  it('starts another column ascending', () => {
    expect(cycleSort<TrackSort['field']>({ field: 'title', direction: 'desc' }, 'year')).toEqual({ field: 'year', direction: 'asc' });
  });
});

describe('parsing a sort', () => {
  it.each(trackSortFields)('knows the track field %s', (field) => {
    expect(parseTrackSort(field, 'desc')).toEqual({ field, direction: 'desc' });
  });

  it('has the fields of the albums apart from the ones of the tracks', () => {
    expect(parseAlbumSort('trackCount', 'asc')).toEqual({ field: 'trackCount', direction: 'asc' });
    expect(parseAlbumSort('track', 'asc')).toBeUndefined();
    expect(parseTrackSort('trackCount', 'asc')).toBeUndefined();
  });

  it.each([
    ['unknown', 'asc'],
    ['title', 'up'],
    ['title', undefined],
    [undefined, 'asc'],
    [['title'], 'asc'],
    ['toString', 'asc'],
  ])('gives no sort for %s %s', (field, direction) => {
    expect(parseTrackSort(field, direction)).toBeUndefined();
  });

  it('restores a saved sort and gives no sort for anything else', () => {
    expect(restoreTrackSort({ field: 'artist', direction: 'asc' })).toEqual({ field: 'artist', direction: 'asc' });
    expect(restoreAlbumSort({ field: 'year', direction: 'desc', extra: 1 })).toEqual({ field: 'year', direction: 'desc' });
    expect([null, 'title', 5, {}, { field: 'x', direction: 'asc' }, { field: 'title' }].map(restoreTrackSort)).toEqual(Array(6).fill(undefined));
  });
});

describe('folders', () => {
  it('parses the strings of a saved selection once each', () => {
    expect(parseFolders(['/a', 3, '/b', '/a', null])).toEqual(['/a', '/b']);
    expect(parseFolders('/a')).toEqual([]);
    expect(parseFolders(undefined)).toEqual([]);
  });

  it('drops a selected folder the library does not have', () => {
    expect(knownFolders(['/a', '/gone'], ['/a', '/b'])).toEqual(['/a']);
    expect(selectedFolders(['/gone'], [folder('/a')])).toEqual([]);
  });
});

describe('the query of a list', () => {
  const state = () => {
    const initial = reducers(undefined, { type: '@@INIT' });
    return {
      ...initial,
      folders: [folder('/a'), folder('/b')],
      uiState: { ...initial.uiState, trackSort: { field: 'year' as const, direction: 'asc' as const }, libraryFolders: ['/b', '/gone'] },
    };
  };

  it('has the sort of the list and the selected folders the library still has', () => {
    expect(selectTrackQuery(state())).toEqual({ sort: { field: 'year', direction: 'asc' }, folders: ['/b'] });
    expect(selectAlbumQuery(state())).toEqual({ sort: undefined, folders: ['/b'] });
  });
});
