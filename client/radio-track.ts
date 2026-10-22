import type { Track } from '../types/library';
import type { RadioStation } from '../types/radio';

const radioPrefix = 'radio:';

/** A station is a track whose path names the station, the audio component plays it through the local server */
export const toRadioTrack = ({ uuid, name, country, tags }: RadioStation): Track => ({
  path: `${radioPrefix}${uuid}`,
  title: name,
  artist: '',
  album: [country, ...tags.slice(0, 3)].filter(Boolean).join(' · '),
  year: '',
  track: '',
  disk: '',
  genre: tags[0] ?? '',
  picture: null,
  duration: null,
});

/** The station of a track, undefined for any other track */
export const radioUuidOf = (path: string) => (path.startsWith(radioPrefix) ? path.slice(radioPrefix.length) : undefined);
