import { execFile } from 'child_process';
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'fs/promises';
import { join } from 'path';

const launcherName = 'emusic';
const iconSizes = [16, 24, 32, 48, 64, 128, 256, 512];

export interface LauncherOptions {
  /** `$XDG_DATA_HOME`, usually `~/.local/share` */
  dataHome: string;
  /** The folder with the `<size>x<size>.png` icons of the app */
  iconsPath: string;
  /** Tells the desktop about the changed entry, `update-desktop-database` by default; it must not reject, it is best effort */
  refresh?: (applicationsPath: string) => Promise<void>;
}

const updateDesktopDatabase = (applicationsPath: string) => new Promise<void>((done) => execFile('update-desktop-database', [applicationsPath], () => done()));

const getApplicationsPath = (dataHome: string) => join(dataHome, 'applications');
const getDesktopFile = (dataHome: string) => join(getApplicationsPath(dataHome), `${launcherName}.desktop`);
const getIconFile = (dataHome: string, size: number) => join(dataHome, 'icons/hicolor', `${size}x${size}`, 'apps', `${launcherName}.png`);

// the characters that would need escaping in the Exec key of a desktop entry; such a path is not worth the risk of a broken launcher
const unsafePath = /["`$\\%\n]/;

/** The content of the desktop entry that starts the AppImage; the window class is the one the app opens with */
export const buildDesktopEntry = (appImage: string) => {
  if (unsafePath.test(appImage)) throw new Error(`The AppImage path ${appImage} can not be used in a desktop entry`);

  return [
    '[Desktop Entry]',
    'Type=Application',
    'Name=eMusic',
    'Comment=Lossless Audio Player',
    `Exec="${appImage}" %U`,
    `Icon=${launcherName}`,
    'Terminal=false',
    'Categories=AudioVideo;Audio;Player;',
    'StartupWMClass=eMusic',
    '',
  ].join('\n');
};

/** The AppImage the installed entry starts, undefined when there is no entry */
export const readLauncherTarget = (dataHome: string) =>
  readFile(getDesktopFile(dataHome), 'utf8')
    .then((entry) => entry.match(/^Exec="([^"]*)"/m)?.[1])
    .catch(() => undefined);

export const isLauncherEnabled = (dataHome: string) => readLauncherTarget(dataHome).then((target) => target !== undefined);

const writeIcon = (size: number, { dataHome, iconsPath }: LauncherOptions) =>
  mkdir(join(dataHome, 'icons/hicolor', `${size}x${size}`, 'apps'), { recursive: true }).then(() =>
    copyFile(join(iconsPath, `${size}x${size}.png`), getIconFile(dataHome, size))
  );

export const enableLauncher = async (appImage: string, options: LauncherOptions) => {
  const entry = buildDesktopEntry(appImage);
  const { dataHome, refresh = updateDesktopDatabase } = options;

  await mkdir(getApplicationsPath(dataHome), { recursive: true });
  await Promise.all(iconSizes.map((size) => writeIcon(size, options)));
  await writeFile(getDesktopFile(dataHome), entry);
  await refresh(getApplicationsPath(dataHome));
};

export const disableLauncher = ({ dataHome, refresh = updateDesktopDatabase }: LauncherOptions) =>
  Promise.all([getDesktopFile(dataHome), ...iconSizes.map((size) => getIconFile(dataHome, size))].map((file) => rm(file, { force: true }))).then(() =>
    refresh(getApplicationsPath(dataHome))
  );

const exists = (path: string) =>
  stat(path).then(
    () => true,
    () => false
  );

/**
 * Keeps an enabled entry working: it points to the running AppImage when the one it started was moved,
 * and goes away when that one is gone and the app does not run from an AppImage; an entry that still works is left alone
 */
export const syncLauncher = async (appImage: string | undefined, options: LauncherOptions) => {
  const target = await readLauncherTarget(options.dataHome);
  if (target === undefined || (await exists(target))) return;

  await (appImage ? enableLauncher(appImage, options) : disableLauncher(options));
};
