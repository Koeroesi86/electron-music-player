import { describe, expect, it } from 'vitest';
import { toSortKey, toSortKeys } from './sortKey';

describe('toSortKey', () => {
  it.each([
    ['Ékes', 'ekes'],
    ['Őrült Űr', 'orult ur'],
    ['  Zebra ', 'zebra'],
    ['ÅNGSTRÖM', 'angstrom'],
  ])('sorts %s as %s, without case and accents', (value, key) => {
    expect(toSortKey(value)).toBe(key);
  });

  it('is empty for a missing value', () => {
    expect(toSortKey(null)).toBe('');
    expect(toSortKey(undefined)).toBe('');
  });

  it('gives the keys of the title, the artist and the album in the order of their columns', () => {
    expect(toSortKeys({ title: 'Á', artist: 'B', album: 'C' })).toEqual(['a', 'b', 'c']);
  });
});
