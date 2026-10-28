import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import LibrarySearch from './LibrarySearch';

const box = () => screen.getByRole<HTMLInputElement>('searchbox', { name: 'Search the library' });

describe('LibrarySearch', () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('starts with the search that is set, without searching again', () => {
    const setSearch = vi.fn();
    render(<LibrarySearch search="halo" setSearch={setSearch} />);
    act(() => void vi.advanceTimersByTime(1000));

    expect(box().value).toBe('halo');
    expect(setSearch).not.toHaveBeenCalled();
  });

  it('searches the text once the typing stops', () => {
    const setSearch = vi.fn();
    render(<LibrarySearch search="" setSearch={setSearch} />);

    fireEvent.change(box(), { target: { value: 'be' } });
    act(() => void vi.advanceTimersByTime(200));
    fireEvent.change(box(), { target: { value: 'bey' } });
    act(() => void vi.advanceTimersByTime(200));
    expect(setSearch).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(400));
    expect(setSearch).toHaveBeenCalledTimes(1);
    expect(setSearch).toHaveBeenCalledWith('bey');
  });
});
