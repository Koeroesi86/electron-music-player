import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Track } from '../../types/library';
import NowPlaying from './NowPlaying';

vi.mock('../favourite-button', () => ({ default: () => null }));

const flac: Track = {
  path: '/music/1.flac',
  artist: 'Artist',
  album: 'Album',
  title: 'One',
  year: 2020,
  track: 1,
  disk: 1,
  genre: '',
  picture: null,
  duration: 60,
  codec: 'FLAC',
  lossless: 1,
  bitDepth: 16,
  sampleRate: 44100,
};
const mp3: Track = { ...flac, path: '/music/2.mp3', title: 'Two', track: 2, codec: 'MP3', lossless: 0, bitrate: 320000, bitDepth: null, sampleRate: null };

describe('NowPlaying', () => {
  afterEach(cleanup);

  it('shows the format of the current song and of each track of the list', () => {
    render(<NowPlaying nowPlaying={[flac, mp3]} currentSong={flac} streamTitle={null} streamArt={null} playTrack={vi.fn()} />);

    expect(screen.getAllByText('FLAC 16/44.1')).toHaveLength(2);
    expect(screen.getByText('MP3 320')).toBeTruthy();
  });
});
