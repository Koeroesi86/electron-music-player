import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Favourite } from '../../types/favourites';
import type { Track } from '../../types/library';
import type { RadioStation } from '../../types/radio';
import { albumFavourite, stationFavourite, trackFavourite } from '../../client/favourites';
import FavouritesView from './FavouritesView';

vi.mock('../favourite-button', () => ({ default: () => null }));
const queued = vi.hoisted(() => vi.fn());
vi.mock('../add-to-queue', async () => {
  const { createElement } = await import('react');

  return {
    default: ({ getTracks }: { getTracks: () => Promise<unknown[]> }) =>
      createElement('button', { 'aria-label': 'Add to the queue', onClick: () => void getTracks().then(queued) }),
  };
});

const track: Track = {
  path: '/music/a.flac',
  artist: 'Artist',
  album: 'Record',
  title: 'One',
  year: 2020,
  track: 1,
  disk: 1,
  genre: '',
  picture: null,
  duration: 10,
};
const station: RadioStation = { uuid: 'abc', name: 'Jazz FM', country: 'Hungary', tags: ['jazz'], codec: 'MP3', bitrate: 128 };
const album = { id: '/music - Album', title: 'Album', path: '/music', artist: 'Artist', cover: null, duration: 20, year: 2020, trackCount: 2 };

const stored = (item: ReturnType<typeof trackFavourite>, available = true): Favourite => ({ ...item, addedAt: 1, available });

describe('FavouritesView', () => {
  afterEach(() => {
    cleanup();
    queued.mockReset();
    vi.unstubAllGlobals();
  });

  const renderView = (favourites: Favourite[], playTracks = vi.fn(), playStation = vi.fn()) => {
    render(<FavouritesView favourites={favourites} playTracks={playTracks} playStation={playStation} />);
    return { playTracks, playStation };
  };

  it('shows the format of a track and of a station, and none of an album', () => {
    renderView([
      stored(trackFavourite({ ...track, codec: 'FLAC', lossless: 1, bitDepth: 16, sampleRate: 44100 })),
      stored(stationFavourite(station)),
      stored(albumFavourite(album)),
    ]);

    expect(screen.getByText('FLAC 16/44.1')).toBeTruthy();
    expect(screen.getByText('MP3 128')).toBeTruthy();
    expect(document.querySelectorAll('.badge')).toHaveLength(2);
  });

  it('adds the track of a favourite to the queue, and offers it for neither a station nor an unavailable one', async () => {
    renderView([stored(trackFavourite(track)), stored(stationFavourite(station)), stored(trackFavourite({ ...track, path: '/music/b.flac' }), false)]);

    const buttons = screen.getAllByRole('button', { name: 'Add to the queue' });
    expect(buttons).toHaveLength(1);

    fireEvent.click(buttons[0]);
    await waitFor(() => expect(queued).toHaveBeenCalledWith([track]));
  });

  it('tells that nothing is marked yet', () => {
    renderView([]);

    expect(screen.getByText(/Nothing is marked yet/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Play all' }).every((button) => button.hasAttribute('disabled'))).toBe(true);
  });

  it('lists the local and the online favourites in their own sections', () => {
    renderView([stored(trackFavourite(track)), stored(albumFavourite(album)), stored(stationFavourite(station))]);

    expect(screen.getByText('One')).toBeTruthy();
    expect(screen.getByText('Artist · Record')).toBeTruthy();
    expect(screen.getByText('Artist · Album')).toBeTruthy();
    expect(screen.getByText('Hungary · jazz')).toBeTruthy();
    const [local, online] = Array.from(document.querySelectorAll('.section'));
    expect(within(local as HTMLElement).getByText('Artist · Album')).toBeTruthy();
    expect(within(online as HTMLElement).getByText('Jazz FM')).toBeTruthy();
  });

  it('plays a single station as the radio plays it', () => {
    const { playStation, playTracks } = renderView([stored(stationFavourite(station))]);

    fireEvent.click(screen.getAllByRole('button', { name: 'Play' })[0]);

    expect(playStation).toHaveBeenCalledWith(station);
    expect(playTracks).not.toHaveBeenCalled();
  });

  it('plays all the local favourites, the tracks of an album among them, in the order of the list', async () => {
    const albumTracks = [
      { ...track, path: '/music/b.flac' },
      { ...track, path: '/music/c.flac' },
    ];
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(albumTracks)));
    const { playTracks } = renderView([stored(trackFavourite(track)), stored(albumFavourite(album)), stored(stationFavourite(station))]);

    fireEvent.click(screen.getAllByRole('button', { name: 'Play all' })[0]);

    await waitFor(() => expect(playTracks).toHaveBeenCalled());
    expect(playTracks.mock.calls[0][0].map(({ path }: Track) => path)).toEqual(['/music/a.flac', '/music/b.flac', '/music/c.flac']);
  });

  it('shows an item that is gone as not available, and does not play it', () => {
    const { playStation, playTracks } = renderView([stored(trackFavourite(track), false), stored(stationFavourite(station), false)]);

    expect(screen.getAllByText('Not available')).toHaveLength(2);
    const buttons = screen.getAllByRole('button', { name: 'Play' });
    buttons.forEach((button) => fireEvent.click(button));
    screen.getAllByText('One').forEach((name) => fireEvent.doubleClick(name));

    expect(buttons.every((button) => button.hasAttribute('disabled'))).toBe(true);
    expect(playTracks).not.toHaveBeenCalled();
    expect(playStation).not.toHaveBeenCalled();
  });
});
