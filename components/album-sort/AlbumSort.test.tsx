import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import AlbumSort from './AlbumSort';

const fieldSelect = () => screen.getByRole<HTMLSelectElement>('combobox', { name: 'Sort albums by' });
const directionSelect = () => screen.getByRole<HTMLSelectElement>('combobox', { name: 'Sort direction' });

describe('AlbumSort', () => {
  afterEach(cleanup);

  it('shows the default order, with the direction out of reach, until a field is picked', () => {
    render(<AlbumSort sort={undefined} setSort={vi.fn()} />);

    expect(fieldSelect().value).toBe('');
    expect(directionSelect().disabled).toBe(true);
    expect([...fieldSelect().options].map((option) => option.textContent)).toEqual([
      'Default order',
      'Title',
      'Artist',
      'Year',
      'Number of tracks',
      'Duration',
    ]);
    expect([...directionSelect().options].map((option) => option.textContent)).toEqual(['Ascending', 'Descending']);
  });

  it('shows the sort', () => {
    render(<AlbumSort sort={{ field: 'year', direction: 'desc' }} setSort={vi.fn()} />);

    expect(fieldSelect().value).toBe('year');
    expect(directionSelect().value).toBe('desc');
    expect(directionSelect().disabled).toBe(false);
  });

  it('picks a field ascending from the default order, and keeps the direction when the field changes', () => {
    const setSort = vi.fn();
    const { rerender } = render(<AlbumSort sort={undefined} setSort={setSort} />);

    fireEvent.change(fieldSelect(), { target: { value: 'artist' } });
    rerender(<AlbumSort sort={{ field: 'artist', direction: 'desc' }} setSort={setSort} />);
    fireEvent.change(fieldSelect(), { target: { value: 'trackCount' } });

    expect(setSort.mock.calls).toEqual([[{ field: 'artist', direction: 'asc' }], [{ field: 'trackCount', direction: 'desc' }]]);
  });

  it('picks the direction, and goes back to the default order with the first option', () => {
    const setSort = vi.fn();
    render(<AlbumSort sort={{ field: 'title', direction: 'asc' }} setSort={setSort} />);

    fireEvent.change(directionSelect(), { target: { value: 'desc' } });
    fireEvent.change(fieldSelect(), { target: { value: '' } });

    expect(setSort.mock.calls).toEqual([[{ field: 'title', direction: 'desc' }], [undefined]]);
  });

  it('ignores a value that is not a field or a direction', () => {
    const setSort = vi.fn();
    render(<AlbumSort sort={{ field: 'title', direction: 'asc' }} setSort={setSort} />);

    fireEvent.change(directionSelect(), { target: { value: 'sideways' } });

    expect(setSort).not.toHaveBeenCalled();
  });
});
