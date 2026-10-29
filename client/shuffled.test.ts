import { describe, expect, it } from 'vitest';
import { shuffled } from './shuffled';

describe('shuffled', () => {
  it('keeps every item once and leaves the list as it was', () => {
    const items = [1, 2, 3, 4, 5, 6];

    expect(shuffled(items).sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('puts the items in the order the random numbers give', () => {
    expect(shuffled(['a', 'b', 'c'], () => 0)).toEqual(['b', 'c', 'a']);
    expect(shuffled(['a', 'b', 'c'], () => 0.99)).toEqual(['a', 'b', 'c']);
  });

  it('copes with no items and with one', () => {
    expect(shuffled([])).toEqual([]);
    expect(shuffled(['a'])).toEqual(['a']);
  });
});
