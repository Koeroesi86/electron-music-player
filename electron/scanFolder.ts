import { parseFile } from 'music-metadata';
import type { IAudioMetadata, IPicture } from 'music-metadata';
import readAudioFormat from './readAudioFormat';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { setImmediate as yieldToEventLoop } from 'timers/promises';
import slugify from 'slugify';
import type { Database } from 'sqlite3';
import type { WebContents } from 'electron';
import type { Track } from '../types/library';
import addTrack from './addTrack';
import { getLibrary } from './libraryRepository';
import isSupported from './isSupported';

const fileReadTimeout = 2000;

const normalizePath = (filePath?: string) => (filePath || '').replace(/\\/g, '/');

const parsePicture = (picture: IPicture, album: string, appDataPath: string): string | null => {
  const extension = picture.format.replace(/^image\//, '').replace(/^jpeg$/, 'jpg');
  if (!extension) return null;

  const folderPath = path.resolve(appDataPath, `./albumart/`);
  const fileHash = crypto.createHash('md5').update(Buffer.from(picture.data).toString('base64')).digest('hex');
  const slug = slugify(album, { remove: /[*+~./()'",!:@\\]/g, lower: true });
  const filePath = path.resolve(folderPath, `./${slug}-${fileHash}.${extension}`);

  fs.mkdirSync(folderPath, { recursive: true });
  // the wx flag fails when the file exists, so there is no gap between the check and the write
  try {
    fs.writeFileSync(filePath, picture.data, { flag: 'wx' });
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) {
      throw error;
    }
  }

  return path.basename(filePath);
};

const transformMeta = ({ common: metadata, format }: IAudioMetadata, fileName: string, appDataPath: string): Track => ({
  path: normalizePath(fileName),
  artist: metadata.artist || '',
  albumArtist: metadata.albumartist || '',
  album: metadata.album ? `${metadata.album}` : '',
  title: metadata.title || '',
  year: metadata.year || '',
  track: (metadata.track && metadata.track.no) || '',
  disk: (metadata.disk && metadata.disk.no) || '',
  genre: (metadata.genre && metadata.genre[0]) || '',
  picture: metadata.picture && metadata.picture[0] ? parsePicture(metadata.picture[0], metadata.album || '', appDataPath) : null,
  duration: format.duration ?? null,
  ...readAudioFormat(format),
});

const isEqual = (a: Track, b: Track) => (Object.keys(a) as (keyof Track)[]).every((key) => `${a[key]}` === `${b[key]}`);

/** Collect the supported audio files of a folder tree, one folder at a time, symbolic links are skipped */
const findFiles = async (directory: string): Promise<string[]> => {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  const found: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    // an entry that is a symbolic link is neither a directory nor a file here
    if (entry.isDirectory()) found.push(...(await findFiles(entryPath)));
    else if (entry.isFile() && isSupported(entryPath)) found.push(entryPath);
  }

  return found;
};

/** Store the tags of a file, unless the library holds them already; a file that takes too long to read is not stored */
const writeMeta = async (fileName: string, existingTracks: Map<string, Track>, database: Database, appDataPath: string) => {
  const timeout = AbortSignal.timeout(fileReadTimeout);
  const timedOut = new Promise<never>((_, reject) => {
    timeout.addEventListener('abort', () => reject(new Error(`File access timeout ${fileName}`)), { once: true });
  });

  const store = async () => {
    const meta = transformMeta(await parseFile(fileName), fileName, appDataPath);
    timeout.throwIfAborted();

    const existingTrack = existingTracks.get(meta.path);
    if (!existingTrack || !isEqual(existingTrack, meta)) await addTrack(database, meta);
  };

  await Promise.race([store(), timedOut]);
};

/** Scan a defined folder for tracks */
const scanFolder = async (folderPath: string, sender: WebContents) => {
  if (!global._database) throw new Error('Database is not connected');
  const database = global._database;
  const appDataPath = global._appDataPath;

  const files = (await findFiles(folderPath)).sort();
  const library = await getLibrary(database);
  const existingTracks = new Map(library.map((track) => [track.path, track]));
  let currentFolder = folderPath;

  for (const [progress, fileName] of files.entries()) {
    const folder = path.dirname(fileName);
    if (folder !== currentFolder) {
      sender.send('SCANNING_FOLDER', { folder });
      currentFolder = folder;
    }

    sender.send('SCANNING_FILE', { fileName, progress, totalCount: files.length });
    await writeMeta(fileName, existingTracks, database, appDataPath).catch((error) => console.error(fileName, error));
    // yields to the event loop between files, so the server and the window stay responsive during a scan
    await yieldToEventLoop();
  }
};

export default scanFolder;
