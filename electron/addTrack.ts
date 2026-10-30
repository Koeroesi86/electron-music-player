import type { Database } from 'sqlite3';
import type { Track } from '../types/library';
import executeQuery from './executeQuery';
import { toSortKeys } from './sortKey';

function addTrack(database: Database, track: Track) {
  return executeQuery(database, {
    query: `INSERT OR REPLACE INTO library (path, artist, album, title, year, track, disk, genre, picture, duration, title_key, artist_key, album_key, album_artist_key, genre_key, albumArtist, codec, bitDepth, sampleRate, bitrate, vbr, lossless, trackGain, albumGain, trackPeak, albumPeak)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    variables: [
      track.path,
      track.artist,
      track.album,
      track.title,
      track.year,
      track.track,
      track.disk,
      track.genre,
      track.picture,
      track.duration,
      ...toSortKeys(track),
      track.albumArtist ?? null,
      track.codec ?? null,
      track.bitDepth ?? null,
      track.sampleRate ?? null,
      track.bitrate ?? null,
      track.vbr ?? null,
      track.lossless ?? null,
      track.trackGain ?? null,
      track.albumGain ?? null,
      track.trackPeak ?? null,
      track.albumPeak ?? null,
    ],
  });
}

export default addTrack;
