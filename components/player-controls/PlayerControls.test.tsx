import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PlayerControls from './PlayerControls';

vi.mock('../scan-progress', () => ({ default: () => null }));

const renderControls = (volume: number) => {
  const props = {
    currentSong: null,
    streamTitle: null,
    streamArt: null,
    currentTime: 0,
    volume,
    shuffle: false,
    repeat: false,
    isPlaying: false,
    addPlayStatusListener: vi.fn(),
    addTimeChangeListener: vi.fn(),
    seek: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    setCurrentTime: vi.fn(),
    setPlaying: vi.fn(),
    setVolume: vi.fn(),
    openEqualizer: vi.fn(),
    toggleRepeat: vi.fn(),
    toggleShuffle: vi.fn(),
    nextSong: vi.fn(),
    previousSong: vi.fn(),
  };
  const view = render(<PlayerControls {...props} />);
  return { ...view, props, rerenderWithVolume: (next: number) => view.rerender(<PlayerControls {...props} volume={next} />) };
};

describe('PlayerControls', () => {
  afterEach(cleanup);

  it('mutes and restores the previous volume', () => {
    const { props, rerenderWithVolume } = renderControls(0.7);

    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
    expect(props.setVolume).toHaveBeenLastCalledWith(0);

    rerenderWithVolume(0);
    fireEvent.click(screen.getByRole('button', { name: 'Unmute' }));
    expect(props.setVolume).toHaveBeenLastCalledWith(0.7);
  });

  it('sets the full volume and opens the equalizer from labelled buttons', () => {
    const { props } = renderControls(0.2);

    fireEvent.click(screen.getByRole('button', { name: 'Full volume' }));
    fireEvent.click(screen.getByRole('button', { name: 'Equalizer' }));

    expect(props.setVolume).toHaveBeenCalledWith(1);
    expect(props.openEqualizer).toHaveBeenCalled();
  });
});
