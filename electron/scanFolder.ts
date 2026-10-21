import { parseFile } from 'music-metadata';
import type { IAudioMetadata, IPicture } from 'music-metadata';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import slugify from 'slugify';
import type { Database } from 'sqlite3';
import type { WebContents } from 'electron';
import type { Track } from '../types/library';
import addTrack from './addTrack';
import executeQuery from './executeQuery';

const supportedFormats = [
  'ape',
  'aif',
  'aiff',
  'aifc',
  'asf',
  'wma',
  'wmv',
  'flac',
  'm4a',
  'm4b',
  'm4p',
  'm4v',
  'm4r',
  '3gp',
  'mp4',
  'aac',
  'mp2',
  'mp3',
  'm2a',
  'ogv',
  'oga',
  'ogx',
  'ogg',
  'opus',
  'wav',
  'wv',
  'wvp',
];

const fileReadTimeout = 2000;
let existingTracks: Map<string, Track> | undefined;
const scannedFolders: string[] = [];
const scannedFiles = new Set<string>();
const foundFiles: string[] = [];
let progress = 0;
let totalCount = 0;
let appDataPath: string;
let database: Database;
let prevFolder: string;

const normalizePath = (filePath?: string) => (filePath || '').replace(/\\/g, '/');

const transformMeta = ({ common: metadata, format }: IAudioMetadata, fileName: string): Promise<Track> =>
  Promise.resolve(
    Object.assign(
      {},
      {
        path: normalizePath(fileName),
        artist: metadata.artist || '',
        album: metadata.album ? `${metadata.album}` : '',
        title: metadata.title || '',
        year: metadata.year || '',
        track: (metadata.track && metadata.track.no) || '',
        disk: (metadata.disk && metadata.disk.no) || '',
        genre: (metadata.genre && metadata.genre[0]) || '',
        picture: metadata.picture && metadata.picture[0] ? parsePicture(metadata.picture[0], metadata.album || '', appDataPath) : null,
        duration: format.duration ?? null,
      }
    )
  );

const isEqual = (a: Track, b: Track) => (Object.keys(a) as (keyof Track)[]).every((key) => `${a[key]}` === `${b[key]}`);

const parsePicture = (picture: IPicture, album: string, appDataPath: string): string | null => {
  const folderPath = path.resolve(appDataPath, `./albumart/`);
  const fileHash = crypto.createHash('md5').update(Buffer.from(picture.data).toString('base64')).digest('hex');
  const slug = slugify(album, { remove: /[*+~./()'",!:@\\]/g, lower: true });
  const fileName = `${slug}-${fileHash}`;
  let extension = picture.format.replace(/^image\//, '');
  switch (extension) {
    case 'jpeg':
      extension = 'jpg';
      break;
  }
  const filePath = path.resolve(folderPath, `./${fileName}.${extension}`);

  if (extension === '' || !extension) {
    return null;
  }

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

const writeMeta = (fileName: string) => {
  return new Promise<void>((resolve, reject) => {
    let cancelled: Error | undefined;
    const timer = setTimeout(() => {
      const err = new Error(`File access timeout ${fileName}`);
      reject(err);
      cancelled = err;
    }, fileReadTimeout);
    parseFile(fileName)
      .then((metadata) => transformMeta(metadata, fileName))
      .then((meta) => {
        if (cancelled) {
          return Promise.reject(cancelled);
        }

        const existingTrack = existingTracks?.get(meta.path);
        if (existingTrack && isEqual(existingTrack, meta)) {
          return Promise.resolve();
        }

        return addTrack(database, meta).then(() => undefined);
      })
      .then(() => {
        clearTimeout(timer);
        resolve();
      })
      .catch((err) => {
        console.error(err.message);
        clearTimeout(timer);
        reject(err);
      });
  });
};

const isSupported = (filePath: string) => supportedFormats.includes(path.extname(filePath).replace('.', ''));

/** Collect the supported audio files of a folder tree, one folder at a time, symbolic links are skipped */
const findFiles = (directory: string): Promise<string[]> =>
  fs.promises.readdir(directory, { withFileTypes: true }).then((entries) =>
    entries.reduce<Promise<string[]>>(
      (found, entry) =>
        found.then((files) => {
          const entryPath = path.join(directory, entry.name);
          if (entry.isSymbolicLink()) return files;
          if (entry.isDirectory()) return findFiles(entryPath).then((nested) => files.concat(nested));
          return entry.isFile() && isSupported(entryPath) ? files.concat(entryPath) : files;
        }),
      Promise.resolve([])
    )
  );

const init = (currentPath: string) => {
  if (existingTracks) {
    return Promise.resolve();
  } else {
    if (!global._database) return Promise.reject(new Error('Database is not connected'));
    appDataPath = global._appDataPath;
    database = global._database;
    prevFolder = currentPath;
    return findFiles(currentPath)
      .then((found) => {
        foundFiles.push(...found.sort());
        totalCount = foundFiles.length;
      })
      .then(() =>
        executeQuery<Track>(database, {
          query: `SELECT * FROM library ORDER BY path ASC`,
          variables: [],
        })
      )
      .then((t) => {
        existingTracks = new Map(t.map((track) => [track.path, track]));
      });
  }
};

const end = () => {
  progress = 0;
  totalCount = 0;
  existingTracks = undefined;
  scannedFolders.splice(0);
  scannedFiles.clear();
  foundFiles.splice(0);
  return Promise.resolve();
};

// yields to the event loop between files, so the server and the window stay responsive during a scan
const nextFile = (next: () => void) => {
  progress += 1;
  setImmediate(next);
};

const stepFile = (fileName: string, sender: WebContents) =>
  new Promise<void>((resolve) => {
    if (scannedFiles.has(fileName)) {
      console.log('double scanned', fileName);
      resolve();
      return;
    }

    const folder = path.dirname(fileName);
    if (folder !== prevFolder) {
      sender.send('SCANNING_FOLDER', { folder });
      prevFolder = folder;
    }

    scannedFiles.add(fileName);
    sender.send('SCANNING_FILE', { fileName, progress, totalCount });
    writeMeta(fileName)
      .catch((e) => console.error(fileName, e))
      .then(() => nextFile(resolve));
  });

const scan = (sender: WebContents) =>
  new Promise<void>((resolve) => {
    foundFiles
      .reduce((p, filePath) => {
        return p.then(() => stepFile(filePath, sender));
      }, Promise.resolve())
      .then(resolve);
  });

/** Scan a defined folder for tracks */
const scanFolder = (folderPath: string, sender: WebContents) =>
  Promise.resolve()
    .then(() => init(folderPath))
    .then(() => scan(sender))
    .finally(end);

export default scanFolder;
