import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Album } from '../../types/library';
import { getCoverUrl } from '../../client/cover-url';
import { getImageTint } from '../../client/cover-tint';
import AlbumDetails from './AlbumDetails';

vi.mock('../favourite-button', () => ({ default: () => null }));
vi.mock('../../client/cover-tint', () => ({ getImageTint: vi.fn() }));

const album: Album = {
  id: 'a1',
  title: 'Title',
  path: '/music/a1',
  artist: 'Artist',
  cover: '/data/albumart/abc123.jpg',
  duration: 125,
  year: 2019,
  tracks: [{ path: '/music/a1/1.flac', artist: 'Artist', album: 'Title', title: 'One', year: 2019, track: 1, disk: 1, genre: '', picture: null, duration: 65 }],
};

const setup = (shown: Album) => render(<AlbumDetails album={shown} playTracks={vi.fn()} close={vi.fn()} />);

describe('AlbumDetails', () => {
  afterEach(() => {
    cleanup();
    vi.mocked(getImageTint).mockReset();
  });

  it('shows the same cover as the thumbnail', () => {
    setup(album);

    expect(screen.getByRole('img').getAttribute('src')).toBe(getCoverUrl('/data/albumart/abc123.jpg'));
  });

  it('shows no image for an album without a cover', () => {
    setup({ ...album, cover: null });

    expect(screen.queryByRole('img')).toBeNull();
  });

  it('drops the image when it fails to load, leaving the placeholder', () => {
    setup(album);

    fireEvent.error(screen.getByRole('img'));

    expect(screen.queryByRole('img')).toBeNull();
  });

  it('plays the tracks of the album', () => {
    const playTracks = vi.fn();
    render(<AlbumDetails album={album} playTracks={playTracks} close={vi.fn()} />);

    fireEvent.click(screen.getByText('Play album'));

    expect(playTracks).toHaveBeenCalledWith(album.tracks);
  });

  it('tints the header with the color of the loaded cover', () => {
    vi.mocked(getImageTint).mockReturnValue('rgb(40, 20, 10)');
    setup(album);

    fireEvent.load(screen.getByRole('img'));

    expect(screen.getByRole('button', { name: 'Close' }).parentElement?.getAttribute('style')).toContain('rgb(40, 20, 10)');
  });

  it('keeps the default header when the cover cannot be read', () => {
    vi.mocked(getImageTint).mockReturnValue(undefined);
    setup(album);

    fireEvent.load(screen.getByRole('img'));

    expect(screen.getByRole('button', { name: 'Close' }).parentElement?.getAttribute('style')).toBeNull();
  });

  it('keeps showing the album while it closes', () => {
    const { rerender } = setup(album);

    rerender(<AlbumDetails album={null} playTracks={vi.fn()} close={vi.fn()} />);

    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('src')).toBe(getCoverUrl('/data/albumart/abc123.jpg'));
  });
});
