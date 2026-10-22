import { cleanup, render } from '@testing-library/react';
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

    expect(view.container.querySelector('audio')?.src).toBe('http://127.0.0.1:3000/radio/abc-1');
  });
});
