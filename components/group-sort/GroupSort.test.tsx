import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import GroupSort from './GroupSort';

const fieldSelect = () => screen.getByRole<HTMLSelectElement>('combobox', { name: 'Sort by' });
const directionSelect = () => screen.getByRole<HTMLSelectElement>('combobox', { name: 'Sort direction' });

describe('GroupSort', () => {
  afterEach(cleanup);

  it('offers the name and the counts, with the direction out of reach until a field is picked', () => {
    render(<GroupSort sort={undefined} setSort={vi.fn()} />);

    expect([...fieldSelect().options].map((option) => option.textContent)).toEqual(['Default order', 'Name', 'Number of albums', 'Number of tracks']);
    expect(directionSelect().disabled).toBe(true);
  });

  it('starts a picked field ascending, keeps the direction when the field changes and sets the direction', () => {
    const setSort = vi.fn();
    const { rerender } = render(<GroupSort sort={undefined} setSort={setSort} />);

    fireEvent.change(fieldSelect(), { target: { value: 'trackCount' } });
    rerender(<GroupSort sort={{ field: 'trackCount', direction: 'asc' }} setSort={setSort} />);
    fireEvent.change(directionSelect(), { target: { value: 'desc' } });
    fireEvent.change(fieldSelect(), { target: { value: '' } });

    expect(setSort).toHaveBeenNthCalledWith(1, { field: 'trackCount', direction: 'asc' });
    expect(setSort).toHaveBeenNthCalledWith(2, { field: 'trackCount', direction: 'desc' });
    expect(setSort).toHaveBeenNthCalledWith(3, undefined);
  });
});
