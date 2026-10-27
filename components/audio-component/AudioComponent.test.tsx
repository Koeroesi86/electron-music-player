import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Track } from '../../types/library';
import { toRadioTrack } from '../../client/radio-track';
import AudioComponent from './AudioComponent';

const station = toRadioTrack({ uuid: 'abc-1', name: 'Jazz FM', country: 'UK', tags: ['jazz'], codec: 'MP3', bitrate: 128 });

const renderAudio = (currentSong: Track | null, isPlaying = false) =>
  render(<AudioComponent currentSong={currentSong} isPlaying={isPlaying} volume={1} port="3000" trackEnded={vi.fn()} connectNode={vi.fn()} />);

describe('AudioComponent', () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();

  beforeEach(() => play.mockClear());
  afterEach(cleanup);

  it('does not start a track by itself when it is loaded paused, as a restored track is', () => {
    const { container } = renderAudio(null);

    expect(container.querySelector('audio')?.autoplay).toBe(false);
  });

  it('keeps a restored track paused', () => {
    const view = renderAudio(null);
    view.rerender(<AudioComponent currentSong={station} isPlaying={false} volume={1} port="3000" trackEnded={vi.fn()} connectNode={vi.fn()} />);

    expect(play).not.toHaveBeenCalled();
  });

  it('plays a track that was asked to play once its source is set', () => {
    const view = renderAudio(null);
    view.rerender(<AudioComponent currentSong={station} isPlaying volume={1} port="3000" trackEnded={vi.fn()} connectNode={vi.fn()} />);

    expect(play).toHaveBeenCalledTimes(1);
  });

  it('plays a station through the local server', () => {
    const view = renderAudio(null);
    view.rerender(<AudioComponent currentSong={station} isPlaying={false} volume={1} port="3000" trackEnded={vi.fn()} connectNode={vi.fn()} />);

    expect(view.container.querySelector('audio')?.src).toBe('emusic://radio/abc-1');
  });
});

describe('AudioComponent local tracks', () => {
  afterEach(cleanup);

  it('plays a track of the library through the emusic protocol', () => {
    const track: Track = { ...toRadioTrack({ uuid: 'abc-1', name: 'x', country: '', tags: [], codec: '', bitrate: 0 }), path: '/music/a b.flac' };
    const view = renderAudio(null);
    view.rerender(<AudioComponent currentSong={track} isPlaying={false} volume={1} port="3000" trackEnded={vi.fn()} connectNode={vi.fn()} />);

    expect(view.container.querySelector('audio')?.src).toBe('emusic://track?path=%2Fmusic%2Fa%20b.flac');
  });
});

describe('AudioComponent radio reconnect', () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();

  beforeEach(() => {
    vi.useFakeTimers();
    play.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const playStation = () => {
    const view = renderAudio(null);
    view.rerender(<AudioComponent currentSong={station} isPlaying volume={1} port="3000" trackEnded={vi.fn()} connectNode={vi.fn()} />);
    play.mockClear();
    return view.container.querySelector('audio') as HTMLAudioElement;
  };

  it('asks a station again when its stream ends', () => {
    const audio = playStation();

    fireEvent.ended(audio);
    vi.advanceTimersByTime(1000);

    expect(play).toHaveBeenCalledTimes(1);
  });

  it('asks a station again when its stream fails, with a longer pause each time', () => {
    const audio = playStation();

    fireEvent.error(audio);
    vi.advanceTimersByTime(1000);
    fireEvent.error(audio);
    vi.advanceTimersByTime(1000);

    expect(play).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);

    expect(play).toHaveBeenCalledTimes(2);
  });

  it('does not ask a station again once it was paused', () => {
    const view = renderAudio(null);
    view.rerender(<AudioComponent currentSong={station} isPlaying volume={1} port="3000" trackEnded={vi.fn()} connectNode={vi.fn()} />);
    play.mockClear();
    view.rerender(<AudioComponent currentSong={station} isPlaying={false} volume={1} port="3000" trackEnded={vi.fn()} connectNode={vi.fn()} />);

    fireEvent.error(view.container.querySelector('audio') as HTMLAudioElement);
    vi.advanceTimersByTime(60_000);

    expect(play).not.toHaveBeenCalled();
  });

  it('still moves on when a file ends', () => {
    const trackEnded = vi.fn();
    const file = { ...station, path: '/music/a.flac' };
    const view = render(<AudioComponent currentSong={file} isPlaying volume={1} port="3000" trackEnded={trackEnded} connectNode={vi.fn()} />);

    fireEvent.ended(view.container.querySelector('audio') as HTMLAudioElement);

    expect(trackEnded).toHaveBeenCalledTimes(1);
  });

  it('moves on to the next track when a file cannot be played', () => {
    const trackEnded = vi.fn();
    const file = { ...station, path: '/mnt/usb/a.flac' };
    const view = render(<AudioComponent currentSong={file} isPlaying volume={1} port="3000" trackEnded={trackEnded} connectNode={vi.fn()} />);

    fireEvent.error(view.container.querySelector('audio') as HTMLAudioElement);

    expect(trackEnded).toHaveBeenCalledTimes(1);
  });

  it('does not move on from a restored track that is paused', () => {
    const trackEnded = vi.fn();
    const file = { ...station, path: '/mnt/usb/a.flac' };
    const view = render(<AudioComponent currentSong={file} isPlaying={false} volume={1} port="3000" trackEnded={trackEnded} connectNode={vi.fn()} />);

    fireEvent.error(view.container.querySelector('audio') as HTMLAudioElement);

    expect(trackEnded).not.toHaveBeenCalled();
  });

  it('stops moving on after a run of files that cannot be played', () => {
    const trackEnded = vi.fn();
    const file = { ...station, path: '/mnt/usb/a.flac' };
    const view = render(<AudioComponent currentSong={file} isPlaying volume={1} port="3000" trackEnded={trackEnded} connectNode={vi.fn()} />);

    Array.from({ length: 30 }).forEach(() => fireEvent.error(view.container.querySelector('audio') as HTMLAudioElement));

    expect(trackEnded).toHaveBeenCalledTimes(10);
  });
});
