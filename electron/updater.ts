import { EventEmitter } from 'events';

export interface SplashProgress {
  text: string;
  percent?: number;
}

export type UpdateOutcome = 'continue' | 'restarting';

export interface UpdateSource extends EventEmitter {
  autoDownload: boolean;
  checkForUpdates: () => Promise<{ isUpdateAvailable: boolean; updateInfo: { version: string } } | null>;
  downloadUpdate: () => Promise<unknown>;
  quitAndInstall: () => void;
}

interface UpdateOptions {
  // a mocked update is downloaded but never installed, the app starts as usual
  install?: boolean;
  checkTimeout?: number;
}

const defaultCheckTimeout = 10000;

const wait = (delay: number) => new Promise<void>((resolve) => setTimeout(resolve, delay));

const withTimeout = <T>(promise: Promise<T>, timeout: number) => {
  let timer: NodeJS.Timeout | undefined;
  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`The update check took longer than ${timeout} ms`)), timeout);
  });

  return Promise.race([promise, timedOut]).finally(() => clearTimeout(timer));
};

// resolves to 'restarting' only when an update was installed and the app is about to quit, any failure lets the app start
export async function runUpdate(source: UpdateSource, report: (progress: SplashProgress) => void, options: UpdateOptions = {}): Promise<UpdateOutcome> {
  const { install = true, checkTimeout = defaultCheckTimeout } = options;

  try {
    source.autoDownload = false;
    report({ text: 'Checking for updates...' });
    const result = await withTimeout(source.checkForUpdates(), checkTimeout);

    if (!result?.isUpdateAvailable) return 'continue';

    const { version } = result.updateInfo;
    report({ text: `Downloading update ${version}...`, percent: 0 });
    source.on('download-progress', ({ percent }: { percent: number }) => report({ text: `Downloading update ${version}...`, percent: Math.round(percent) }));
    await source.downloadUpdate();

    if (!install) return 'continue';

    report({ text: 'Restarting to install the update...', percent: 100 });
    source.quitAndInstall();
    return 'restarting';
  } catch (error) {
    console.error('Update failed, starting the installed version', error);
    return 'continue';
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
