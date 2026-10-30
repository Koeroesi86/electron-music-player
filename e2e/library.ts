import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { drawCover, writeFlac } from '../scripts/screenshot-media';

export interface FixtureTrack {
  title: string;
  /** The pitch of the generated sine, so what is heard says which track plays */
  frequency: number;
}

export interface FixtureAlbum {
  title: string;
  artist: string;
  genre: string;
  year: number;
  tracks: FixtureTrack[];
}

const trackSeconds = 6;

/** Two albums of made up tracks, each a sine of its own pitch: 440 Hz is the A of the first track, 880 Hz an octave above, 100 Hz is in the reach of the bass of the equalizer */
export const albums: FixtureAlbum[] = [
  {
    title: 'Pitch Perfect',
    artist: 'The Sine Waves',
    genre: 'Electronic',
    year: 2020,
    tracks: [
      { title: 'Concert A', frequency: 440 },
      { title: 'Octave Up', frequency: 880 },
      { title: 'Deep Bass', frequency: 100 },
    ],
  },
  { title: 'Single Note', artist: 'Lone Oscillator', genre: 'Ambient', year: 2022, tracks: [{ title: 'Hold It', frequency: 440 }] },
];

const cover = drawCover(
  {
    sky: [
      [10, 20, 60],
      [40, 90, 140],
    ],
    sun: [120, 230, 200],
    ground: [
      [48, 60, 150],
      [14, 20, 70],
    ],
    shape: 'waves',
  },
  64
);

export const writeTrack = (folder: string, album: FixtureAlbum, index: number, seconds = trackSeconds) => {
  const track = album.tracks[index];
  mkdirSync(folder, { recursive: true });
  writeFileSync(
    join(folder, `${index + 1}-${track.title.toLowerCase().replace(/ /g, '-')}.flac`),
    writeFlac({
      seconds,
      frequency: track.frequency,
      cover,
      tags: {
        TITLE: track.title,
        ARTIST: album.artist,
        ALBUMARTIST: album.artist,
        ALBUM: album.title,
        GENRE: album.genre,
        TRACKNUMBER: index + 1,
        DATE: album.year,
      },
    })
  );
};

/** Writes the albums, a folder each, in the folder */
export const writeLibrary = (folder: string) =>
  albums.forEach((album) => album.tracks.forEach((_, index) => writeTrack(join(folder, album.title.toLowerCase().replace(/ /g, '-')), album, index)));
