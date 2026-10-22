import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Track } from '../../types/library';
import { toRadioTrack } from '../../client/radio-track';
import AudioComponent from './AudioComponent';

const station = toRadioTrack({ uuid: 'abc-1', name: 'Jazz FM', country: 'UK', tags: ['jazz'], codec: 'MP3', bitrate: 128 });

const renderAudio = (currentSong: Track | null) =>
  render(<AudioComponent currentSong={currentSong} volume={1} port="3000" trackEnded={vi.fn()} connectNode={vi.fn()} />);

describe('AudioComponent', () => {
  afterEach(cleanup);

  it('starts playing a loaded track by itself, as the play command can arrive before the source is set', () => {
    const { container } = renderAudio(null);

    expect(container.querySelector('audio')?.autoplay).toBe(true);
  });

  it('plays a station through the local server', () => {
    const view = renderAudio(null);
    view.rerender(<AudioComponent currentSong={station} volume={1} port="3000" trackEnded={vi.fn()} connectNode={vi.fn()} />);

    expect(view.container.querySelector('audio')?.src).toBe('http://127.0.0.1:3000/radio/abc-1');
  });
});
