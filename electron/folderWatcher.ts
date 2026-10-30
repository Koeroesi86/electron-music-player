import fs from 'fs';

/** Watches folders with the file system of the system, which does not report a drive that comes and goes or a network drive: the scans at start and when a folder is back stay */
export const createFolderWatcher = (onChange: (folder: string) => void, watch: typeof fs.watch = fs.watch) => {
  const watchers = new Map<string, fs.FSWatcher>();

  const stop = (folder: string) => {
    watchers.get(folder)?.close();
    watchers.delete(folder);
  };

  // an event only says that something changed below the folder, the scan finds out what
  const open = (folder: string) => {
    try {
      const watcher = watch(folder, { recursive: true }, () => onChange(folder));
      // an unplugged drive, or the limit of watches of Linux, ends the watching of the folder, not the app
      watcher.on('error', (e) => {
        console.error(`Stopped watching ${folder}`, e);
        stop(folder);
      });
      watchers.set(folder, watcher);
    } catch (e) {
      console.error(`Cannot watch ${folder}`, e);
    }
  };

  return {
    /** Watch exactly these folders */
    update: (folders: string[]) => {
      [...watchers.keys()].filter((folder) => !folders.includes(folder)).forEach(stop);
      folders.filter((folder) => !watchers.has(folder)).forEach(open);
    },
    close: () => [...watchers.keys()].forEach(stop),
  };
};
