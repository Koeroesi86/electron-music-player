import fs from 'fs';
import path from 'path';
import { withTimeout } from './folderAvailability';
import { mapInChunks } from './inChunks';
import { toChanges } from './libraryChange';
import type { Change } from './libraryChange';

type DirectoryTimes = Map<string, number>;

const directoriesInFlight = 16;

/** The modification time of a directory and the directories in it, undefined when it cannot be read or does not answer */
const readDirectory = (directory: string) =>
  withTimeout(
    Promise.all([fs.promises.stat(directory), fs.promises.readdir(directory, { withFileTypes: true })]).then(([stat, entries]) => ({
      time: Math.floor(stat.mtimeMs),
      directories: entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(directory, entry.name)),
    })),
    undefined
  );

/** The folder and the folders below it with their modification times, which change when a file in one is added, removed or renamed; a folder that cannot be read is left out, so none is returned for one that does not answer. A few folders are read at a time */
export const readDirectoryTimes = async (folder: string): Promise<DirectoryTimes> => {
  const times: DirectoryTimes = new Map();

  const visit = async (level: string[]): Promise<void> => {
    if (level.length === 0) return;

    const reads = await mapInChunks(level, directoriesInFlight, readDirectory);
    reads.forEach((read, index) => read && times.set(level[index], read.time));
    await visit(reads.flatMap((read) => read?.directories ?? []));
  };

  await visit([folder]);
  return times;
};

const maxUserWatches = 8192;

/** On Linux every folder below a watched one takes a watch of the user, which the editor and the file manager share, so a quarter of them is the most the library takes; the other systems watch a tree natively */
const watchBudget = () => {
  if (process.platform !== 'linux') return Infinity;

  try {
    return Math.floor(Number(fs.readFileSync('/proc/sys/fs/inotify/max_user_watches', 'utf8')) / 4) || maxUserWatches / 4;
  } catch {
    return maxUserWatches / 4;
  }
};

/** What differs between two looks: the folders with another time or that are new are scanned for their own files, a folder that is gone is looked at with what was below it */
const differences = (before: DirectoryTimes, after: DirectoryTimes): Change[] => [
  ...[...after].filter(([directory, time]) => before.get(directory) !== time).map(([directory]) => ({ path: directory, deep: false })),
  ...[...before.keys()].filter((directory) => !after.has(directory)).map((directory) => ({ path: directory, deep: true })),
];

interface Options {
  watch?: typeof fs.watch;
  readTimes?: (folder: string) => Promise<DirectoryTimes>;
  /** The most folders, with the folders below them, that get a watch */
  budget?: number;
  /** How often the folders are looked at, as the watch does not report a network drive and does not cover what is over the budget */
  checkInterval?: number;
  /** The least time between two looks, as the window asks every time it gets the focus */
  checkGap?: number;
}

interface Tracked {
  directories: number;
  watcher?: fs.FSWatcher;
  /** The modification times at the last look, none after the watcher saw a change: that change is scanned already */
  baseline?: DirectoryTimes;
}

/** Tells what changed in the folders: a watch of the system where there is budget for one, and a look at the modification times of their folders every few minutes and when asked, which also covers a drive that gives no events */
export const createFolderWatcher = (onChange: (changes: Change[]) => void, options: Options = {}) => {
  const { watch = fs.watch, readTimes = readDirectoryTimes, budget = watchBudget(), checkInterval = 5 * 60_000, checkGap = 30_000 } = options;
  const tracked = new Map<string, Tracked>();
  let queue = Promise.resolve();
  let timer: NodeJS.Timeout | undefined;
  let lastCheck = 0;
  let closed = false;

  const watchedDirectories = () => [...tracked.values()].filter((entry) => entry.watcher).reduce((sum, entry) => sum + entry.directories, 0);

  const untrack = (folder: string) => {
    tracked.get(folder)?.watcher?.close();
    tracked.delete(folder);
  };

  // an event only says that something changed below the folder, the scan finds out what
  const open = (folder: string, entry: Tracked) => {
    try {
      const watcher = watch(folder, { recursive: true }, (_event, filename) => {
        entry.baseline = undefined;
        // without a name, the whole folder changed as far as is known
        toChanges(filename ? path.join(folder, filename.toString()) : folder).then(onChange, (e) => console.error(e));
      });
      // an unplugged drive, or the limit of watches of Linux, ends the watch of the folder, not the app: the looks go on
      watcher.on('error', (e) => {
        console.error(`Stopped watching ${folder}`, e);
        watcher.close();
        entry.watcher = undefined;
      });
      return watcher;
    } catch (e) {
      console.error(`Cannot watch ${folder}`, e);
      return undefined;
    }
  };

  const track = async (folder: string) => {
    const times = await readTimes(folder);
    // a folder that does not answer is tried again with the next update
    if (closed || times.size === 0) return;

    const entry: Tracked = { directories: times.size, baseline: times };
    const fits = watchedDirectories() + entry.directories <= budget;
    if (!fits) console.warn(`Not watching ${folder}, it has ${entry.directories} folders: it is looked at every few minutes`);
    entry.watcher = fits ? open(folder, entry) : undefined;
    tracked.set(folder, entry);
  };

  const apply = async (folders: string[]) => {
    [...tracked.keys()].filter((folder) => !folders.includes(folder)).forEach(untrack);
    await Promise.all(folders.filter((folder) => !tracked.has(folder)).map(track));
    if (closed || tracked.size === 0) {
      clearInterval(timer);
      timer = undefined;
      return;
    }

    timer ??= setInterval(() => void check(), checkInterval);
  };

  const look = async (folder: string, entry: Tracked) => {
    const times = await readTimes(folder);
    if (times.size === 0) return;

    const { baseline } = entry;
    entry.baseline = times;
    const changes = baseline ? differences(baseline, times) : [];
    if (changes.length > 0) onChange(changes);
  };

  /** Look at the folders now, unless it was done a moment ago */
  const check = async () => {
    if (Date.now() - lastCheck < checkGap) return;

    lastCheck = Date.now();
    await Promise.all([...tracked].map(([folder, entry]) => look(folder, entry)));
  };

  return {
    /** Keep exactly these folders: a watch and a look for each, or a look alone for a folder over the budget or that cannot be watched */
    update: (folders: string[]) => {
      queue = queue.then(() => apply(folders)).catch((e) => console.error(e));
      return queue;
    },
    check,
    close: () => {
      closed = true;
      clearInterval(timer);
      [...tracked.keys()].forEach(untrack);
    },
  };
};
