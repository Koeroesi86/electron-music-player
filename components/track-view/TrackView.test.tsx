import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Track } from '../../types/library';
import type { TrackSort } from '../../types/library-query';
import { createPageCache, pageSize, storePage } from '../../client/redux/library/pages';
import TrackView from './TrackView';

// the heart is tested with its own component, it needs the store
vi.mock('../favourite-button', () => ({ default: () => null }));

const track = (index: number): Track => ({
  path: `/music/${index}.flac`,
  artist: 'Artist',
  album: 'Album',
  title: `Title ${index}`,
  year: 2020,
  track: index,
  disk: 1,
  genre: '',
  picture: null,
  duration: 60,
});

const baseProps = {
  currentSong: null,
  offlineFolders: [],
  sort: undefined,
  selected: [],
  folders: [],
  playTracks: vi.fn(),
  loadPage: vi.fn(),
  setSort: vi.fn(),
};

describe('TrackView', () => {
  afterEach(cleanup);

  const firstPage = storePage(
    createPageCache<Track>(),
    0,
    Array.from({ length: pageSize }, (_, index) => track(index)),
    50000
  );

  it('renders the rows of the window only, in a box as high as the whole list', () => {
    const { container, queryByText } = render(<TrackView {...baseProps} tracks={firstPage} />);

    expect(queryByText('Title 0')).not.toBeNull();
    expect(queryByText('Title 99')).toBeNull();
    expect(container.querySelectorAll('[class]').length).toBeLessThan(400);
    expect(container.querySelector<HTMLElement>('.window')?.style.height).toBe('1000000px');
  });

  it('requests the pages missing for the window', () => {
    const loadPage = vi.fn();
    render(<TrackView {...baseProps} tracks={firstPage} loadPage={loadPage} />);

    expect(loadPage).not.toHaveBeenCalled();
  });

  it('requests the first page of an empty cache', () => {
    const loadPage = vi.fn();
    render(<TrackView {...baseProps} tracks={createPageCache<Track>()} loadPage={loadPage} />);

    expect(loadPage).toHaveBeenCalledWith(0);
  });
  it('dims the tracks in an offline folder', () => {
    const { getByText } = render(<TrackView {...baseProps} tracks={firstPage} offlineFolders={['/music']} />);

    expect(getByText('Title 0').closest('[title]')?.getAttribute('title')).toMatch(/cannot be reached/);
  });

  describe('sorting by a column header', () => {
    const headers = () => screen.getAllByRole('columnheader');
    const headerOf = (name: string) => screen.getByRole('button', { name });
    const sortOf = (name: string) => headerOf(name).closest('[role="columnheader"]')?.getAttribute('aria-sort');

    it.each([
      ['Title', 'title'],
      ['Artist', 'artist'],
      ['Album', 'album'],
      ['Year', 'year'],
      ['Duration', 'duration'],
      ['#', 'track'],
    ])('sorts by %s ascending on the first click', (name, field) => {
      const setSort = vi.fn();
      render(<TrackView {...baseProps} tracks={firstPage} setSort={setSort} />);

      fireEvent.click(headerOf(name));

      expect(setSort).toHaveBeenCalledWith({ field, direction: 'asc' });
    });

    it('goes ascending, descending and back to the default order on the same column', () => {
      const setSort = vi.fn();
      const { rerender } = render(<TrackView {...baseProps} tracks={firstPage} setSort={setSort} />);
      const cycle = (sort: TrackSort | undefined) => {
        rerender(<TrackView {...baseProps} tracks={firstPage} sort={sort} setSort={setSort} />);
        fireEvent.click(headerOf('Title'));
      };

      cycle(undefined);
      cycle({ field: 'title', direction: 'asc' });
      cycle({ field: 'title', direction: 'desc' });
      cycle({ field: 'artist', direction: 'desc' });

      expect(setSort.mock.calls).toEqual([
        [{ field: 'title', direction: 'asc' }],
        [{ field: 'title', direction: 'desc' }],
        [undefined],
        [{ field: 'title', direction: 'asc' }],
      ]);
    });

    it('exposes the direction of the sorted column only', () => {
      render(<TrackView {...baseProps} tracks={firstPage} sort={{ field: 'year', direction: 'desc' }} />);

      expect(headers()).toHaveLength(6);
      expect(sortOf('Year')).toBe('descending');
      expect(['Title', 'Artist', 'Album', 'Duration', '#'].map(sortOf)).toEqual(Array(5).fill('none'));
    });

    it('exposes the ascending direction', () => {
      render(<TrackView {...baseProps} tracks={firstPage} sort={{ field: 'title', direction: 'asc' }} />);

      expect(sortOf('Title')).toBe('ascending');
    });

    it('starts from the top when the sort or the folders change, and not when they stay', () => {
      const { container, rerender } = render(<TrackView {...baseProps} tracks={firstPage} />);
      const listing = container.querySelector<HTMLElement>('.listing');
      if (!listing) throw new Error('no listing');

      listing.scrollTop = 300;
      rerender(<TrackView {...baseProps} tracks={firstPage} />);
      expect(listing.scrollTop).toBe(300);

      rerender(<TrackView {...baseProps} tracks={firstPage} sort={{ field: 'title', direction: 'asc' }} />);
      expect(listing.scrollTop).toBe(0);

      listing.scrollTop = 300;
      rerender(
        <TrackView
          {...baseProps}
          tracks={firstPage}
          sort={{ field: 'title', direction: 'asc' }}
          folders={[{ path: '/m', lastModified: 1 }]}
          selected={['/m']}
        />
      );
      expect(listing.scrollTop).toBe(0);
    });
  });
});
