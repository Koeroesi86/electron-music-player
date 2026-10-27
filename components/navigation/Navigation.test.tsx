import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Navigation from './Navigation';

describe('Navigation', () => {
  afterEach(cleanup);

  it.each([
    ['Home', 'home'],
    ['Now playing', 'now-playing'],
    ['Local collection', 'local'],
    ['Online', 'online-sources'],
    ['Liked', 'favourites'],
    ['Equalizer', 'equalizer'],
    ['Settings', 'settings'],
  ])('selects the %s tab on click', (label, tab) => {
    const setTab = vi.fn();
    render(<Navigation setTab={setTab} />);

    fireEvent.click(screen.getByText(label));

    expect(setTab).toHaveBeenCalledWith(tab);
  });

  it('marks only the current tab as active', () => {
    render(<Navigation tab="equalizer" />);

    const active = Array.from(document.querySelectorAll('.active')).map((item) => item.textContent);
    expect(active).toEqual(['Equalizer']);
  });

  it('defaults to the home screen', () => {
    render(<Navigation />);

    expect(document.querySelector('.active')?.textContent).toBe('Home');
  });

  describe('playlists', () => {
    const playlists = [
      { id: 1, name: 'Road', entries: [] },
      { id: 2, name: 'Night', entries: [] },
    ];

    it('lists the playlists in a group with the liked tracks', () => {
      render(<Navigation playlists={playlists} />);

      expect(Array.from(document.querySelectorAll('.item')).map((item) => item.textContent)).toEqual(
        expect.arrayContaining(['Liked', 'Road', 'Night', 'New playlist'])
      );
      expect(screen.getByText('Playlists')).toBeTruthy();
    });

    it('opens a playlist on click and marks only that one as active', () => {
      const openPlaylist = vi.fn();
      render(<Navigation tab="playlist" playlistId={2} playlists={playlists} openPlaylist={openPlaylist} />);

      fireEvent.click(screen.getByText('Road'));

      expect(openPlaylist).toHaveBeenCalledWith(1);
      expect(Array.from(document.querySelectorAll('.active')).map((item) => item.textContent)).toEqual(['Night']);
    });

    it('creates a playlist from the name that was typed, and not from an empty one', () => {
      const createPlaylist = vi.fn();
      render(<Navigation createPlaylist={createPlaylist} />);

      fireEvent.click(screen.getByText('New playlist'));
      fireEvent.submit(screen.getByLabelText('Playlist name'));
      fireEvent.click(screen.getByText('New playlist'));
      fireEvent.change(screen.getByLabelText('Playlist name'), { target: { value: ' Gym ' } });
      fireEvent.submit(screen.getByLabelText('Playlist name'));

      expect(createPlaylist.mock.calls).toEqual([['Gym']]);
      expect(screen.queryByLabelText('Playlist name')).toBeNull();
    });

    it('gives up the new playlist on Escape', () => {
      const createPlaylist = vi.fn();
      render(<Navigation createPlaylist={createPlaylist} />);

      fireEvent.click(screen.getByText('New playlist'));
      fireEvent.keyDown(screen.getByLabelText('Playlist name'), { key: 'Escape' });

      expect(screen.queryByLabelText('Playlist name')).toBeNull();
      expect(createPlaylist).not.toHaveBeenCalled();
    });

    it('moves a playlist to where it is dropped', () => {
      const movePlaylist = vi.fn();
      render(<Navigation playlists={playlists} movePlaylist={movePlaylist} />);
      const dataTransfer = { setData: vi.fn(), effectAllowed: '' };

      fireEvent.dragStart(screen.getByText('Night').closest('.item') as HTMLElement, { dataTransfer });
      fireEvent.drop(screen.getByText('Road').closest('.item') as HTMLElement, { dataTransfer });

      expect(movePlaylist).toHaveBeenCalledWith(2, 0);
    });
  });
});
