import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { HistoryItem } from '../../types/favourites';
import type { Track } from '../../types/library';
import type { RadioStation } from '../../types/radio';
import { stationFavourite, trackFavourite } from '../../client/favourites';
import { toRadioTrack } from '../../client/radio-track';
import HomeView from './HomeView';

vi.mock('../favourite-button', () => ({ default: () => null }));

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
  duration: 65,
};
const station: RadioStation = { uuid: 'abc', name: 'Jazz FM', country: 'Hungary', tags: ['jazz'], codec: 'MP3', bitrate: 128 };

const played = (item: ReturnType<typeof trackFavourite>, available = true): HistoryItem => ({ ...item, playedAt: 1, available });

describe('HomeView', () => {
  afterEach(cleanup);

  const renderView = (history: HistoryItem[], currentSong: Track | null = null) => {
    const props = { playTracks: vi.fn(), playStation: vi.fn(), clearHistory: vi.fn() };
    render(<HomeView history={history} currentSong={currentSong} {...props} />);
    return props;
  };

  it('tells that nothing was played yet and has nothing to clear', () => {
    renderView([]);

    expect(screen.getByText(/Nothing was played yet/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Clear history' }).hasAttribute('disabled')).toBe(true);
  });

  it('lists the tracks and the stations in the order of the history', () => {
    renderView([played(stationFavourite(station)), played(trackFavourite(track))]);

    expect(Array.from(document.querySelectorAll('.name')).map((name) => name.textContent)).toEqual(['Jazz FM', 'One']);
    expect(screen.getByText('Artist')).toBeTruthy();
    expect(screen.getByText('Record')).toBeTruthy();
    expect(screen.getByText('Radio station')).toBeTruthy();
    expect(screen.getByText('00:01:05')).toBeTruthy();
  });

  it('shows the format of a track and of a station', () => {
    renderView([played(stationFavourite(station)), played(trackFavourite({ ...track, codec: 'FLAC', lossless: 1, bitDepth: 24, sampleRate: 96000 }))]);

    expect(screen.getByText('MP3 128')).toBeTruthy();
    expect(screen.getByText('FLAC 24/96')).toBeTruthy();
  });

  it('highlights the row that plays, the station among them', () => {
    renderView([played(stationFavourite(station)), played(trackFavourite(track))], toRadioTrack(station));

    expect(Array.from(document.querySelectorAll('.current')).map((row) => row.querySelector('.name')?.textContent)).toEqual(['Jazz FM']);
  });

  it('plays a station as the radio plays it', () => {
    const { playStation, playTracks } = renderView([played(stationFavourite(station))]);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    expect(playStation).toHaveBeenCalledWith(station);
    expect(playTracks).not.toHaveBeenCalled();
  });

  it('plays a track on a double click', async () => {
    const { playTracks } = renderView([played(trackFavourite(track))]);

    fireEvent.doubleClick(screen.getByText('One'));

    await waitFor(() => expect(playTracks).toHaveBeenCalledWith([track]));
  });

  it('shows an item that is gone as not available, and does not play it', () => {
    const { playStation, playTracks } = renderView([played(trackFavourite(track), false), played(stationFavourite(station), false)]);

    const button = screen.getAllByRole('button', { name: 'Play' });
    button.forEach((item) => fireEvent.click(item));
    fireEvent.doubleClick(screen.getByText('One'));

    expect(screen.getAllByText('Not available')).toHaveLength(2);
    expect(button.every((item) => item.hasAttribute('disabled'))).toBe(true);
    expect(playTracks).not.toHaveBeenCalled();
    expect(playStation).not.toHaveBeenCalled();
  });

  it('clears the history only after it is confirmed', () => {
    const { clearHistory } = renderView([played(trackFavourite(track))]);

    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));
    expect(clearHistory).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'No' }));
    expect(clearHistory).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    expect(clearHistory).toHaveBeenCalledTimes(1);
  });
});
