import { describe, expect, it } from 'vitest';
import { splitStreamTitle, toNowPlaying } from './now-playing';
import { toRadioTrack } from './radio-track';

const station = toRadioTrack({ uuid: 'abc', name: 'Jazz FM', country: 'Hungary', tags: ['jazz'], codec: 'MP3', bitrate: 128 });

describe('stream title', () => {
  it.each([
    ['Artist - Song', 'Artist', 'Song'],
    ['Artist - Song - Live', 'Artist', 'Song - Live'],
    ['  Artist  -  Song ', 'Artist', 'Song'],
    ['Just a title', '', 'Just a title'],
    ['Artist-Song', '', 'Artist-Song'],
    ['Artist - ', '', 'Artist -'],
  ])('splits %j', (streamTitle, artist, title) => {
    expect(splitStreamTitle(streamTitle)).toEqual({ artist, title });
  });
});

describe('now playing', () => {
  it('shows the song on air with the station as its album and the art found', () => {
    const { track, cover } = toNowPlaying(station, 'Artist - Song', 'abcd', '3000');

    expect(track).toMatchObject({ title: 'Song', artist: 'Artist', album: 'Jazz FM', picture: null });
    expect(cover).toBe('http://127.0.0.1:3000/radio-art/abcd');
  });

  it('shows the station without art while it is looked up', () => {
    expect(toNowPlaying(station, 'Artist - Song', null, '3000').cover).toBeUndefined();
  });

  it('shows the station as it is when the stream sends no title', () => {
    expect(toNowPlaying(station, null, null, '3000')).toEqual({ track: station, cover: undefined });
  });

  it('shows a library track as it is, whatever title is left', () => {
    const track = { ...station, path: '/music/a.flac', picture: '/art/x.png' };

    expect(toNowPlaying(track, 'Artist - Song', null, '3000')).toEqual({ track, cover: 'http://127.0.0.1:3000/albumart/x-optimized.png' });
  });
});
