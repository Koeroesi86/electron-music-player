import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { Track } from '../../types/library';
import { createPageCache, pageSize, storePage } from '../../client/redux/library/pages';
import TrackView from './TrackView';

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

describe('TrackView', () => {
  afterEach(cleanup);

  const firstPage = storePage(
    createPageCache<Track>(),
    0,
    Array.from({ length: pageSize }, (_, index) => track(index)),
    50000
  );

  it('renders the rows of the window only, in a box as high as the whole list', () => {
    const { container, queryByText } = render(<TrackView tracks={firstPage} currentSong={null} port="3000" playTracks={vi.fn()} loadPage={vi.fn()} />);

    expect(queryByText('Title 0')).not.toBeNull();
    expect(queryByText('Title 99')).toBeNull();
    expect(container.querySelectorAll('[class]').length).toBeLessThan(400);
    expect(container.querySelector<HTMLElement>('.window')?.style.height).toBe('1000000px');
  });

  it('requests the pages missing for the window', () => {
    const loadPage = vi.fn();
    render(<TrackView tracks={firstPage} currentSong={null} port="3000" playTracks={vi.fn()} loadPage={loadPage} />);

    expect(loadPage).not.toHaveBeenCalled();
  });

  it('requests the first page of an empty cache', () => {
    const loadPage = vi.fn();
    render(<TrackView tracks={createPageCache<Track>()} currentSong={null} port="3000" playTracks={vi.fn()} loadPage={loadPage} />);

    expect(loadPage).toHaveBeenCalledWith(0);
  });
});
