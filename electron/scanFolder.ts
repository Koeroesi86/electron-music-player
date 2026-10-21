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

const folderDelay = 200; // delay after a folder scan
const fileDelay = 100; // delay after a file scan
const fileReadTimeout = 2000;
const breakLimit = 1000; // take a break after this amount of scanned files
const breakMultiplier = 100; // multiply the default file delay on a break
let existingTracks: Track[] | undefined;
const scannedFolders: string[] = [];
const scannedFiles: string[] = [];
const foundFiles: string[] = [];
let counter = 0;
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

        const existingTrack = existingTracks?.find((track) => track.path === meta.path);
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

/** Collect the supported audio files of a folder tree, symbolic links are skipped */
const findFilesSync = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) return [];
    if (entry.isDirectory()) return findFilesSync(entryPath);
    return entry.isFile() && isSupported(entryPath) ? [entryPath] : [];
  });

const init = (currentPath: string) => {
  if (existingTracks) {
    return Promise.resolve();
  } else {
    if (!global._database) return Promise.reject(new Error('Database is not connected'));
    appDataPath = global._appDataPath;
    database = global._database;
    prevFolder = currentPath;
    foundFiles.push(...findFilesSync(currentPath).sort());
    totalCount = foundFiles.length;
    return executeQuery<Track>(database, {
      query: `SELECT * FROM library ORDER BY path ASC`,
      variables: [],
    }).then((t) => {
      existingTracks = t;
      return Promise.resolve();
    });
  }
};

const end = () => {
  progress = 0;
  totalCount = 0;
  existingTracks = undefined;
  scannedFolders.splice(0);
  scannedFiles.splice(0);
  foundFiles.splice(0);
  return Promise.resolve();
};

const nextFile = (next: () => void) => {
  counter += 1;
  progress += 1;
  let delay = fileDelay;
  if (counter >= breakLimit) {
    delay = fileDelay * breakMultiplier;
    console.log(`Taking a ${delay / 1000} second break...`);
  }
  setTimeout(() => {
    if (counter >= breakLimit) {
      console.log('I am back!');
      counter = 0;
    }
    next();
  }, delay);
};

const stepFile = (fileName: string, sender: WebContents) =>
  new Promise<void>((resolve) => {
    if (scannedFiles.includes(fileName)) {
      console.log('double scanned', fileName);
      resolve();
      return;
    }

    const folder = path.dirname(fileName);
    if (folder !== prevFolder) {
      sender.send('SCANNING_FOLDER', { folder });
      prevFolder = folder;
    }

    scannedFiles.push(fileName);
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
