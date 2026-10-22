import { EventEmitter } from 'events';

export interface SplashProgress {
  text: string;
  percent?: number;
}

export interface UpdateSource extends EventEmitter {
  autoDownload: boolean;
  checkForUpdates: () => Promise<{ isUpdateAvailable: boolean; updateInfo: { version: string } } | null>;
  downloadUpdate: () => Promise<unknown>;
  quitAndInstall: (isSilent?: boolean, isForceRunAfter?: boolean) => void;
}

interface UpdateOptions {
  // a mocked update is downloaded but never installed, the app starts as usual
  install?: boolean;
  checkTimeout?: number;
  // the download fails when no progress arrives for this long
  downloadStallTimeout?: number;
  // how long the splash waits for the app to quit after the installer was started
  installTimeout?: number;
}

const defaultCheckTimeout = 10000;
const defaultDownloadStallTimeout = 60000;
const defaultInstallTimeout = 30000;

const wait = (delay: number) => new Promise<void>((resolve) => setTimeout(resolve, delay));

const withTimeout = <T>(promise: Promise<T>, timeout: number) => {
  let timer: NodeJS.Timeout | undefined;
  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`The update check took longer than ${timeout} ms`)), timeout);
  });

  return Promise.race([promise, timedOut]).finally(() => clearTimeout(timer));
};

const downloadWithStallTimeout = (source: UpdateSource, timeout: number) => {
  let timer: NodeJS.Timeout | undefined;
  const stalled = new Promise<never>((_resolve, reject) => {
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => reject(new Error(`The update download made no progress for ${timeout} ms`)), timeout);
    };

    arm();
    source.on('download-progress', arm);
  });

  return Promise.race([source.downloadUpdate(), stalled]).finally(() => clearTimeout(timer));
};

// the installer quits the app, so with an update installed this only returns when something went wrong or nothing was installed:
// any failure lets the installed version start
export async function runUpdate(source: UpdateSource, report: (progress: SplashProgress) => void, options: UpdateOptions = {}): Promise<void> {
  const {
    install = true,
    checkTimeout = defaultCheckTimeout,
    downloadStallTimeout = defaultDownloadStallTimeout,
    installTimeout = defaultInstallTimeout,
  } = options;

  try {
    source.autoDownload = false;
    report({ text: 'Checking for updates...' });
    const result = await withTimeout(source.checkForUpdates(), checkTimeout);

    if (!result?.isUpdateAvailable) return;

    const { version } = result.updateInfo;
    report({ text: `Downloading update ${version}...`, percent: 0 });
    source.on('download-progress', ({ percent }: { percent: number }) => report({ text: `Downloading update ${version}...`, percent: Math.round(percent) }));
    await downloadWithStallTimeout(source, downloadStallTimeout);

    if (!install) return;

    report({ text: 'Restarting to install the update...', percent: 100 });
    // silent on windows, so the installer shows nothing, and the app is started again afterwards
    source.quitAndInstall(true, true);
    await wait(installTimeout);
    console.error(`The app did not quit ${installTimeout} ms after the update was installed, starting the installed version`);
  } catch (error) {
    console.error('Update failed, starting the installed version', error);
  }
}

// stands in for electron-updater on development instances: reports a fake update and its progress
export function createMockUpdateSource(stepDelay = 250): UpdateSource {
  const source: UpdateSource = Object.assign(new EventEmitter(), {
    autoDownload: false,
    checkForUpdates: () => wait(stepDelay).then(() => ({ isUpdateAvailable: true, updateInfo: { version: '0.0.0-mock' } })),
    downloadUpdate: () =>
      Array.from({ length: 10 }, (_, step) => (step + 1) * 10).reduce<Promise<unknown>>(
        (previous, percent) => previous.then(() => wait(stepDelay)).then(() => source.emit('download-progress', { percent })),
        Promise.resolve()
      ),
    quitAndInstall: () => console.log('Mocked update, nothing to install'),
  });

  return source;
}

/**
 * electron-updater only works in the packaged app, on Linux only in an AppImage (the Flatpak updates through its store),
 * and EMUSIC_NO_UPDATE=1 turns it off, which the smoke tests of the packaged app set
 */
export const canUpdate = (isPackaged: boolean, platform: NodeJS.Platform, env: NodeJS.ProcessEnv) =>
  isPackaged && env.EMUSIC_NO_UPDATE !== '1' && (platform !== 'linux' || Boolean(env.APPIMAGE));
