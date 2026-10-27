import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Track } from '../../types/library';
import AddToPlaylist from './AddToPlaylist';

const track: Track = { path: '/music/a.flac', artist: '', album: '', title: 'A', year: '', track: '', disk: '', genre: '', picture: null, duration: 1 };
const playlists = [
  { id: 1, name: 'Road', entries: [] },
  { id: 2, name: 'Night', entries: [] },
];

describe('AddToPlaylist', () => {
  afterEach(cleanup);

  const renderButton = (add = vi.fn(), create = vi.fn(), onRowClick = vi.fn()) => {
    render(
      <div onClick={onRowClick}>
        <AddToPlaylist source={track} playlists={playlists} add={add} create={create} />
      </div>
    );
    return { add, create, onRowClick };
  };
  const open = () => fireEvent.click(screen.getByRole('button', { name: 'Add to a playlist' }));

  it('lists the playlists once it is opened', () => {
    renderButton();
    expect(screen.queryByRole('menu')).toBeNull();

    open();

    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Road', 'Night']);
  });

  it('adds the track to the picked playlist and closes', () => {
    const { add } = renderButton();
    open();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Night' }));

    expect(add).toHaveBeenCalledWith(2, track);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('creates a playlist with the name that was typed, and not with an empty one', () => {
    const { create } = renderButton();
    open();

    expect((screen.getByRole('button', { name: 'Create' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Playlist name'), { target: { value: '  Gym ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(create).toHaveBeenCalledWith('Gym', track);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes on Escape and on a click outside', () => {
    renderButton();

    open();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();

    open();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('does not pass its clicks to the row that holds it', () => {
    const { onRowClick } = renderButton();

    open();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Road' }));

    expect(onRowClick).not.toHaveBeenCalled();
  });
});
