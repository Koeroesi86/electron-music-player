import { describe, expect, it } from 'vitest';
import { radioUuidOf, toRadioTrack } from './radio-track';

const station = { uuid: 'abc-1', name: 'Jazz FM', country: 'Hungary', tags: ['jazz', 'smooth', 'lounge', 'chill'], codec: 'MP3', bitrate: 128 };

describe('radio track', () => {
  it('describes a station as a track', () => {
    expect(toRadioTrack(station)).toMatchObject({
      path: 'radio:abc-1',
      title: 'Jazz FM',
      album: 'Hungary · jazz · smooth · lounge',
      genre: 'jazz',
      picture: null,
    });
  });

  it('copes with a station without country and tags', () => {
    expect(toRadioTrack({ ...station, country: '', tags: [] })).toMatchObject({ album: '', genre: '' });
  });

  it('finds the station of its track', () => {
    expect(radioUuidOf(toRadioTrack(station).path)).toBe('abc-1');
  });

  it.each(['/music/a.flac', 'http://example.com/stream', ''])('has no station in the path %j', (path) => {
    expect(radioUuidOf(path)).toBeUndefined();
  });
});
