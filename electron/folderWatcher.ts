import fs from 'fs';
import path from 'path';
import { withTimeout } from './folderAvailability';

type DirectoryTimes = Map<string, number>;

/** The folder and the folders below it with their modification times, which change when a file in one is added, removed or renamed; a folder that cannot be read is left out, and none is returned for one that does not answer */
export const readDirectoryTimes = (folder: string): Promise<DirectoryTimes> => {
  const times: DirectoryTimes = new Map();

  const visit = async (directory: string): Promise<void> => {
    const [stat, entries] = await Promise.all([fs.promises.stat(directory), fs.promises.readdir(directory, { withFileTypes: true })]).catch(() => []);
    if (!stat || !entries) return;

    times.set(directory, Math.floor(stat.mtimeMs));
    await Promise.all(entries.filter((entry) => entry.isDirectory()).map((entry) => visit(path.join(directory, entry.name))));
  };

  return withTimeout(
    visit(folder).then(() => times),
    new Map()
  );
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

const isSame = (before: DirectoryTimes, after: DirectoryTimes) =>
  before.size === after.size && [...after].every(([directory, time]) => before.get(directory) === time);

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

/** Tells which of the folders changed: a watch of the system where there is budget for one, and a look at the modification times of their folders every few minutes and when asked, which also covers a drive that gives no events */
export const createFolderWatcher = (onChange: (folder: string) => void, options: Options = {}) => {
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
      const watcher = watch(folder, { recursive: true }, () => {
        entry.baseline = undefined;
        onChange(folder);
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
    if (baseline && !isSame(baseline, times)) onChange(folder);
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
