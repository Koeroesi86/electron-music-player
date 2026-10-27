import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { RadioStation } from '../../types/radio';
import type { RadioState } from '../../client/redux/radio/reducer';
import RadioStations from './RadioStations';

// the heart is tested with its own component, it needs the store
vi.mock('../favourite-button', () => ({ default: () => null }));

const jazz: RadioStation = { uuid: 'a', name: 'Jazz FM', country: 'Hungary', tags: ['jazz'], codec: 'MP3', bitrate: 128 };
const rock: RadioStation = { uuid: 'b', name: 'Rock Radio', country: '', tags: [], codec: 'AAC', bitrate: 0 };

const radio = (state: Partial<RadioState> = {}): RadioState => ({
  query: {},
  offset: 0,
  hasMore: false,
  stations: [jazz, rock],
  tags: [{ name: 'jazz', stationCount: 12 }],
  countries: [
    { value: 'HU', name: 'Hungary', stationCount: 40 },
    { value: 'DE', name: 'Germany', stationCount: 90 },
  ],
  languages: [{ value: 'hungarian', name: 'hungarian', stationCount: 30 }],
  codecs: [{ value: 'AAC', name: 'AAC', stationCount: 50 }],
  loading: false,
  ...state,
});

const renderPanel = (state?: Partial<RadioState>, currentStation?: string) => {
  const handlers = { search: vi.fn(), loadTags: vi.fn(), loadOptions: vi.fn(), play: vi.fn() };
  const view = render(<RadioStations radio={radio(state)} currentStation={currentStation} {...handlers} />);
  return { ...handlers, ...view };
};

describe('RadioStations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('loads the genres and the most popular stations when it opens', () => {
    const { search, loadTags, loadOptions } = renderPanel();

    expect(loadTags).toHaveBeenCalledOnce();
    expect(loadOptions).toHaveBeenCalledOnce();
    expect(search).toHaveBeenCalledWith({});
  });

  it('lists the stations with their details', () => {
    renderPanel();

    expect(screen.getByText('Jazz FM')).toBeTruthy();
    expect(screen.getByText('Hungary · MP3 · 128 kbps')).toBeTruthy();
    expect(screen.getByText('AAC · Unknown bitrate')).toBeTruthy();
  });

  it('plays a station on double click', () => {
    const { play } = renderPanel();

    fireEvent.doubleClick(screen.getByText('Rock Radio'));

    expect(play).toHaveBeenCalledWith(rock);
  });

  it('plays a station from its play button', () => {
    const { play, container } = renderPanel();

    fireEvent.click(container.querySelector('.playButton') as Element);

    expect(play).toHaveBeenCalledWith(jazz);
  });

  it('marks the station that is playing', () => {
    renderPanel(undefined, 'b');

    expect(screen.getByText('Rock Radio').parentElement?.classList.contains('current')).toBe(true);
    expect(screen.getByText('Jazz FM').parentElement?.classList.contains('current')).toBe(false);
  });

  it('searches by name after typing stops', () => {
    const { search } = renderPanel();
    search.mockClear();

    fireEvent.change(screen.getByPlaceholderText('Search stations'), { target: { value: 'jaz' } });
    fireEvent.change(screen.getByPlaceholderText('Search stations'), { target: { value: ' jazz ' } });
    expect(search).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(search).toHaveBeenCalledOnce();
    expect(search).toHaveBeenCalledWith({ name: 'jazz' });
  });

  it('unmounts cleanly when a search returns the dispatched action', () => {
    const { search, unmount } = renderPanel();
    search.mockReturnValue({ type: 'SEARCH_RADIO' });
    fireEvent.change(screen.getByPlaceholderText('Search stations'), { target: { value: 'jazz' } });
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(() => unmount()).not.toThrow();
  });

  it('filters by genre and keeps the name', () => {
    const { search } = renderPanel({ query: { name: 'fm' } });
    search.mockClear();

    fireEvent.change(screen.getByLabelText('Genre'), { target: { value: 'jazz' } });
    expect(search).toHaveBeenCalledWith({ name: 'fm', tag: 'jazz' });

    fireEvent.change(screen.getByLabelText('Genre'), { target: { value: '' } });
    expect(search).toHaveBeenLastCalledWith({ name: 'fm', tag: undefined });
  });

  it('searches with a filter at once and keeps the others', () => {
    const { search } = renderPanel({ query: { name: 'fm', tag: 'jazz' } });
    search.mockClear();

    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'HU' } });
    expect(search).toHaveBeenLastCalledWith({ name: 'fm', tag: 'jazz', country: 'HU' });

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'hungarian' } });
    fireEvent.change(screen.getByLabelText('Codec'), { target: { value: 'AAC' } });
    fireEvent.change(screen.getByLabelText('Minimum bitrate'), { target: { value: '192' } });
    expect(search).toHaveBeenNthCalledWith(2, expect.objectContaining({ language: 'hungarian' }));
    expect(search).toHaveBeenNthCalledWith(3, expect.objectContaining({ codec: 'AAC' }));
    expect(search).toHaveBeenLastCalledWith({ name: 'fm', tag: 'jazz', bitrateMin: 192 });
  });

  it('shows the station counts and shows the selected values', () => {
    renderPanel({ query: { country: 'DE', bitrateMin: 320 } });

    expect(screen.getByRole('option', { name: 'Germany (90)' })).toBeTruthy();
    expect((screen.getByLabelText('Country') as HTMLSelectElement).value).toBe('DE');
    expect((screen.getByLabelText('Minimum bitrate') as HTMLSelectElement).value).toBe('320');
  });

  it('keeps a saved filter selectable when its list did not load', () => {
    renderPanel({ query: { country: 'HU', codec: 'FLAC' }, countries: [], codecs: [] });

    expect((screen.getByLabelText('Country') as HTMLSelectElement).value).toBe('HU');
    expect((screen.getByLabelText('Codec') as HTMLSelectElement).value).toBe('FLAC');
    expect(screen.getByLabelText('Language')).toBeTruthy();
  });

  it('counts the active filters and clears them but not the sort', () => {
    const { search } = renderPanel({ query: { name: 'fm', country: 'HU', sort: 'name', descending: false } });
    search.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Clear 2 filters' }));

    expect(search).toHaveBeenCalledWith({ sort: 'name', descending: false });
    expect((screen.getByPlaceholderText('Search stations') as HTMLInputElement).value).toBe('');
  });

  it('does not run the cleared name search again when the typing delay ends', () => {
    const { search, rerender } = renderPanel({ query: { name: 'fm' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear 1 filter' }));
    // the store has the cleared query by then
    rerender(<RadioStations radio={radio({ query: {} })} search={search} loadTags={vi.fn()} loadOptions={vi.fn()} play={vi.fn()} />);
    search.mockClear();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(search).not.toHaveBeenCalled();
  });

  it('has nothing to clear without filters', () => {
    renderPanel({ query: { sort: 'votes' } });

    expect((screen.getByRole('button', { name: 'Clear filters' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('sorts by a field and a direction, and goes back to the default', () => {
    const { search } = renderPanel({ query: { country: 'HU' } });
    search.mockClear();

    expect((screen.getByLabelText('Sort by') as HTMLSelectElement).value).toBe('popularity');
    expect((screen.getByLabelText('Order') as HTMLSelectElement).value).toBe('desc');

    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'bitrate' } });
    expect(search).toHaveBeenLastCalledWith({ country: 'HU', sort: 'bitrate' });

    fireEvent.change(screen.getByLabelText('Order'), { target: { value: 'asc' } });
    expect(search).toHaveBeenLastCalledWith({ country: 'HU', descending: false });

    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'popularity' } });
    expect(search).toHaveBeenLastCalledWith({ country: 'HU', sort: undefined });
  });

  it('loads the next page of a narrowed list only while there is one', () => {
    const { search } = renderPanel({ query: { country: 'HU' }, offset: 60, hasMore: true });
    search.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(search).toHaveBeenCalledWith({ country: 'HU', offset: 120 });
  });

  it('hides load more at the end of the list and while loading', () => {
    const view = renderPanel({ hasMore: false });
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();

    view.rerender(<RadioStations radio={radio({ hasMore: true, loading: true })} search={vi.fn()} loadTags={vi.fn()} loadOptions={vi.fn()} play={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });

  it('shows what is going on instead of an empty list', () => {
    const view = renderPanel({ stations: [], loading: true });
    expect(screen.getByText('Loading stations…')).toBeTruthy();

    view.rerender(<RadioStations radio={radio({ stations: [] })} search={vi.fn()} loadTags={vi.fn()} loadOptions={vi.fn()} play={vi.fn()} />);
    expect(screen.getByText('No stations found')).toBeTruthy();

    view.rerender(<RadioStations radio={radio({ stations: [], error: 'offline' })} search={vi.fn()} loadTags={vi.fn()} loadOptions={vi.fn()} play={vi.fn()} />);
    expect(screen.getByText('The station directory is not available: offline')).toBeTruthy();
    expect(screen.queryByText('No stations found')).toBeNull();
  });
});
