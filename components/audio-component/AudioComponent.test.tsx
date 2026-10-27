import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Track } from '../../types/library';
import { toRadioTrack } from '../../client/radio-track';
import AudioComponent from './AudioComponent';

const station = toRadioTrack({ uuid: 'abc-1', name: 'Jazz FM', country: 'UK', tags: ['jazz'], codec: 'MP3', bitrate: 128 });

const renderAudio = (currentSong: Track | null, isPlaying = false) =>
  render(<AudioComponent currentSong={currentSong} isPlaying={isPlaying} volume={1} trackEnded={vi.fn()} connectNode={vi.fn()} />);

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
    view.rerender(<AudioComponent currentSong={station} isPlaying={false} volume={1} trackEnded={vi.fn()} connectNode={vi.fn()} />);

    expect(play).not.toHaveBeenCalled();
  });

  it('plays a track that was asked to play once its source is set', () => {
    const view = renderAudio(null);
    view.rerender(<AudioComponent currentSong={station} isPlaying volume={1} trackEnded={vi.fn()} connectNode={vi.fn()} />);

    expect(play).toHaveBeenCalledTimes(1);
  });

  it('plays a station through the local server', () => {
    const view = renderAudio(null);
    view.rerender(<AudioComponent currentSong={station} isPlaying={false} volume={1} trackEnded={vi.fn()} connectNode={vi.fn()} />);

    expect(view.container.querySelector('audio')?.src).toBe('emusic://app/radio/abc-1');
  });
});

describe('AudioComponent end of a track', () => {
  const track: Track = { ...station, path: '/music/a.flac' };
  const other: Track = { ...station, path: '/music/b.flac' };
  const trackEnded = vi.fn();
  const element = (view: ReturnType<typeof render>) => view.container.querySelector('audio') as HTMLAudioElement;
  const renderTrack = (song: Track) => render(<AudioComponent currentSong={song} isPlaying={false} volume={1} trackEnded={trackEnded} connectNode={vi.fn()} />);

  beforeEach(() => trackEnded.mockClear());
  afterEach(cleanup);

  it('steps to the next track once however often the end is reached', () => {
    const view = renderTrack(track);

    fireEvent.ended(element(view));
    fireEvent.ended(element(view));
    fireEvent.ended(element(view));

    expect(trackEnded).toHaveBeenCalledTimes(1);
  });

  it('steps again at the end of the next track', () => {
    const view = renderTrack(track);
    fireEvent.ended(element(view));
    view.rerender(<AudioComponent currentSong={other} isPlaying={false} volume={1} trackEnded={trackEnded} connectNode={vi.fn()} />);

    fireEvent.ended(element(view));

    expect(trackEnded).toHaveBeenCalledTimes(2);
  });

  it('steps again when the same track is played again', () => {
    const view = renderTrack(track);
    fireEvent.ended(element(view));
    fireEvent.play(element(view));

    fireEvent.ended(element(view));

    expect(trackEnded).toHaveBeenCalledTimes(2);
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
    view.rerender(<AudioComponent currentSong={station} isPlaying volume={1} trackEnded={vi.fn()} connectNode={vi.fn()} />);
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
    view.rerender(<AudioComponent currentSong={station} isPlaying volume={1} trackEnded={vi.fn()} connectNode={vi.fn()} />);
    play.mockClear();
    view.rerender(<AudioComponent currentSong={station} isPlaying={false} volume={1} trackEnded={vi.fn()} connectNode={vi.fn()} />);

    fireEvent.error(view.container.querySelector('audio') as HTMLAudioElement);
    vi.advanceTimersByTime(60_000);

    expect(play).not.toHaveBeenCalled();
  });

  it('still moves on when a file ends', () => {
    const trackEnded = vi.fn();
    const file = { ...station, path: '/music/a.flac' };
    const view = render(<AudioComponent currentSong={file} isPlaying volume={1} trackEnded={trackEnded} connectNode={vi.fn()} />);

    fireEvent.ended(view.container.querySelector('audio') as HTMLAudioElement);

    expect(trackEnded).toHaveBeenCalledTimes(1);
  });

  it('moves on to the next track when a file cannot be played', () => {
    const trackEnded = vi.fn();
    const file = { ...station, path: '/mnt/usb/a.flac' };
    const view = render(<AudioComponent currentSong={file} isPlaying volume={1} trackEnded={trackEnded} connectNode={vi.fn()} />);

    fireEvent.error(view.container.querySelector('audio') as HTMLAudioElement);

    expect(trackEnded).toHaveBeenCalledTimes(1);
  });

  it('does not move on from a restored track that is paused', () => {
    const trackEnded = vi.fn();
    const file = { ...station, path: '/mnt/usb/a.flac' };
    const view = render(<AudioComponent currentSong={file} isPlaying={false} volume={1} trackEnded={trackEnded} connectNode={vi.fn()} />);

    fireEvent.error(view.container.querySelector('audio') as HTMLAudioElement);

    expect(trackEnded).not.toHaveBeenCalled();
  });

  it('stops moving on after a run of files that cannot be played', () => {
    const trackEnded = vi.fn();
    const file = { ...station, path: '/mnt/usb/a.flac' };
    const view = render(<AudioComponent currentSong={file} isPlaying volume={1} trackEnded={trackEnded} connectNode={vi.fn()} />);

    Array.from({ length: 30 }).forEach(() => fireEvent.error(view.container.querySelector('audio') as HTMLAudioElement));

    expect(trackEnded).toHaveBeenCalledTimes(10);
  });
});
