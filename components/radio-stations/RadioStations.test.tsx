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
  stations: [jazz, rock],
  tags: [{ name: 'jazz', stationCount: 12 }],
  loading: false,
  ...state,
});

const renderPanel = (state?: Partial<RadioState>, currentStation?: string) => {
  const handlers = { search: vi.fn(), loadTags: vi.fn(), play: vi.fn() };
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
    const { search, loadTags } = renderPanel();

    expect(loadTags).toHaveBeenCalledOnce();
    expect(search).toHaveBeenCalledWith({});
  });

  it('lists the stations with their details', () => {
    renderPanel();

    expect(screen.getByText('Jazz FM')).toBeTruthy();
    expect(screen.getByText('Hungary · MP3 · 128 kbps')).toBeTruthy();
    expect(screen.getByText('AAC')).toBeTruthy();
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

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'jazz' } });
    expect(search).toHaveBeenCalledWith({ name: 'fm', tag: 'jazz' });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
    expect(search).toHaveBeenLastCalledWith({ name: 'fm', tag: undefined });
  });

  it('shows what is going on instead of an empty list', () => {
    const view = renderPanel({ stations: [], loading: true });
    expect(screen.getByText('Loading stations…')).toBeTruthy();

    view.rerender(<RadioStations radio={radio({ stations: [] })} search={vi.fn()} loadTags={vi.fn()} play={vi.fn()} />);
    expect(screen.getByText('No stations found')).toBeTruthy();

    view.rerender(<RadioStations radio={radio({ stations: [], error: 'offline' })} search={vi.fn()} loadTags={vi.fn()} play={vi.fn()} />);
    expect(screen.getByText('The station directory is not available: offline')).toBeTruthy();
    expect(screen.queryByText('No stations found')).toBeNull();
  });
});
