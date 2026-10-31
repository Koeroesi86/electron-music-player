import { cpSync, existsSync } from 'fs';
import { basename } from 'path';

// what a running app holds open or can rebuild: a copy of a lock would make the copy of the app look like a second instance
const skipped = new Set(['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile', 'Cache', 'Code Cache', 'GPUCache', 'DawnCache', 'GrShaderCache']);

/** The name of the app that shows in the OS (the media controls, the dock): the folder of Electron's own data follows it */
export const getAppName = (isDev: boolean) => `eMusic${isDev ? '-dev' : ''}`;

/**
 * Copies the Electron data (window state, saved settings of the page) of the folder the app used before it was named, once.
 * The old folder stays where it is, and a copy that fails is ignored: the app starts as on a first run.
 */
export const copyOldUserData = (oldFolder: string, newFolder: string) => {
  if (existsSync(newFolder) || !existsSync(oldFolder)) return false;

  try {
    cpSync(oldFolder, newFolder, { recursive: true, filter: (source) => !skipped.has(basename(source)) });

    return true;
  } catch (error) {
    console.error('The data of the app was not copied from', oldFolder, error);

    return false;
  }
};
