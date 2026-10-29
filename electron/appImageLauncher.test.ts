import { mkdir, mkdtemp, readdir, readFile, rm, stat, utimes, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { normalize, posix } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildDesktopEntry,
  disableLauncher,
  enableLauncher,
  isLauncherEnabled,
  markLauncherOffered,
  readLauncherTarget,
  syncLauncher,
  wasLauncherOffered,
} from './appImageLauncher';
import type { LauncherOptions } from './appImageLauncher';

// the entry only takes paths without a backslash, the temporary folder of Windows is full of them
const { join } = posix;
const createFolder = (prefix: string) => mkdtemp(join(tmpdir(), prefix)).then((folder) => folder.replaceAll('\\', '/'));

const sizes = [16, 24, 32, 48, 64, 128, 256, 512];

describe('buildDesktopEntry', () => {
  it('starts the AppImage and groups the window with the entry', () => {
    const entry = buildDesktopEntry('/home/me/Apps/eMusic-26.10.1.AppImage');

    expect(entry).toContain('Exec="/home/me/Apps/eMusic-26.10.1.AppImage" %U');
    expect(entry).toContain('Comment=Lossless Audio Player');
    expect(entry).toContain('Comment[hu]=');
    expect(entry).toContain('Icon=emusic');
    expect(entry).toContain('Categories=AudioVideo;Audio;Player;');
    expect(entry).toContain('StartupWMClass=eMusic');
  });

  it('keeps a path with spaces in one piece', () => {
    expect(buildDesktopEntry('/home/me/My Apps/eMusic.AppImage')).toContain('Exec="/home/me/My Apps/eMusic.AppImage" %U');
  });

  it.each(['/home/me/a"b.AppImage', '/home/me/$HOME.AppImage', '/home/me/100%.AppImage', '/home/me/a\\b.AppImage', '/home/me/a\nb.AppImage'])(
    'refuses %j, it would break the Exec key',
    (path) => {
      expect(() => buildDesktopEntry(path)).toThrow('can not be used in a desktop entry');
    }
  );
});

describe('launcher on disk', () => {
  let folder: string;
  let options: LauncherOptions;
  let refresh: ReturnType<typeof vi.fn<(applicationsPath: string) => Promise<void>>>;
  const appImage = () => join(folder, 'Apps/eMusic.AppImage');

  const createAppImage = (path: string) => mkdir(join(path, '..'), { recursive: true }).then(() => writeFile(path, ''));
  const desktopFile = () => join(folder, 'data/applications/emusic.desktop');
  const exists = (path: string) =>
    stat(path).then(
      () => true,
      () => false
    );

  beforeEach(async () => {
    folder = await createFolder('emusic-launcher-');
    await mkdir(join(folder, 'icons'));
    await Promise.all(sizes.map((size) => writeFile(join(folder, 'icons', `${size}x${size}.png`), `icon ${size}`)));
    refresh = vi.fn(() => Promise.resolve());
    options = { dataHome: join(folder, 'data'), iconsPath: join(folder, 'icons'), refresh };
  });

  afterEach(() => rm(folder, { recursive: true, force: true }));

  it('is not enabled before it was added', async () => {
    await expect(isLauncherEnabled(options.dataHome)).resolves.toBe(false);
    await expect(readLauncherTarget(options.dataHome)).resolves.toBeUndefined();
  });

  it('adds the entry and the icons, and tells the desktop', async () => {
    await enableLauncher(appImage(), options);

    await expect(readFile(desktopFile(), 'utf8')).resolves.toBe(buildDesktopEntry(appImage()));
    await expect(readFile(join(folder, 'data/icons/hicolor/256x256/apps/emusic.png'), 'utf8')).resolves.toBe('icon 256');
    await expect(readdir(join(folder, 'data/icons/hicolor'))).resolves.toHaveLength(sizes.length);
    await expect(isLauncherEnabled(options.dataHome)).resolves.toBe(true);
    await expect(readLauncherTarget(options.dataHome)).resolves.toBe(appImage());
    expect(refresh).toHaveBeenCalledExactlyOnceWith(normalize(join(folder, 'data/applications')));
  });

  it('makes the icon theme newer than the icon cache of the desktop when the icons are rewritten', async () => {
    const theme = join(folder, 'data/icons/hicolor');
    await enableLauncher(appImage(), options);
    const past = new Date('2020-01-01');
    await utimes(theme, past, past);

    await enableLauncher(appImage(), options);

    expect((await stat(theme)).mtime.getTime()).toBeGreaterThan(past.getTime());
  });

  it('replaces the entry with a new file, as an entry rewritten in place stays unseen by the desktop shell', async () => {
    await enableLauncher(appImage(), options);
    const before = (await stat(desktopFile())).ino;
    await enableLauncher(join(folder, 'other/moved.AppImage'), options);

    expect((await stat(desktopFile())).ino).not.toBe(before);
    await expect(readdir(join(folder, 'data/applications'))).resolves.toEqual(['emusic.desktop']);
  });

  it('leaves nothing behind when the path can not be used', async () => {
    await expect(enableLauncher(join(folder, 'a"b.AppImage'), options)).rejects.toThrow('can not be used');

    await expect(exists(join(folder, 'data'))).resolves.toBe(false);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('removes the entry and the icons, and keeps the other files of the user', async () => {
    const other = join(folder, 'data/applications/other.desktop');
    await enableLauncher(appImage(), options);
    await writeFile(other, 'keep');

    await disableLauncher(options);

    await expect(isLauncherEnabled(options.dataHome)).resolves.toBe(false);
    await expect(exists(join(folder, 'data/icons/hicolor/512x512/apps/emusic.png'))).resolves.toBe(false);
    await expect(readFile(other, 'utf8')).resolves.toBe('keep');
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('can be removed when it was never added', async () => {
    await expect(disableLauncher(options)).resolves.toBeUndefined();
  });

  describe('syncLauncher', () => {
    it('does nothing without an entry', async () => {
      await syncLauncher(appImage(), options);

      await expect(isLauncherEnabled(options.dataHome)).resolves.toBe(false);
      expect(refresh).not.toHaveBeenCalled();
    });

    it('leaves an entry alone while its AppImage exists', async () => {
      const first = join(folder, 'first/eMusic.AppImage');
      await createAppImage(first);
      await enableLauncher(first, options);
      refresh.mockClear();

      await syncLauncher(appImage(), options);

      await expect(readLauncherTarget(options.dataHome)).resolves.toBe(first);
      expect(refresh).not.toHaveBeenCalled();
    });

    it('leaves the entry of the running AppImage alone while its content is the same', async () => {
      await createAppImage(appImage());
      await enableLauncher(appImage(), options);
      refresh.mockClear();

      await syncLauncher(appImage(), options);

      expect(refresh).not.toHaveBeenCalled();
    });

    it('rewrites the entry of the running AppImage when its content changed', async () => {
      await createAppImage(appImage());
      await enableLauncher(appImage(), options);
      await writeFile(desktopFile(), buildDesktopEntry(appImage()).replace('Icon=emusic', 'Icon=old'));
      refresh.mockClear();

      await syncLauncher(appImage(), options);

      await expect(readFile(desktopFile(), 'utf8')).resolves.toBe(buildDesktopEntry(appImage()));
      expect(refresh).toHaveBeenCalledOnce();
    });

    it('rewrites the icons of the running AppImage when they changed', async () => {
      await createAppImage(appImage());
      await enableLauncher(appImage(), options);
      await writeFile(join(folder, 'icons/256x256.png'), 'new icon 256');

      await syncLauncher(appImage(), options);

      await expect(readFile(join(folder, 'data/icons/hicolor/256x256/apps/emusic.png'), 'utf8')).resolves.toBe('new icon 256');
    });

    it('restores an icon that went missing', async () => {
      await createAppImage(appImage());
      await enableLauncher(appImage(), options);
      await rm(join(folder, 'data/icons/hicolor/16x16/apps/emusic.png'));

      await syncLauncher(appImage(), options);

      await expect(exists(join(folder, 'data/icons/hicolor/16x16/apps/emusic.png'))).resolves.toBe(true);
    });

    it('points the entry to the running AppImage when the AppImage was moved', async () => {
      await enableLauncher(join(folder, 'old/eMusic.AppImage'), options);

      await syncLauncher(appImage(), options);

      await expect(readLauncherTarget(options.dataHome)).resolves.toBe(appImage());
    });

    it('drops the entry when its AppImage is gone and the app does not run from an AppImage', async () => {
      await enableLauncher(join(folder, 'old/eMusic.AppImage'), options);

      await syncLauncher(undefined, options);

      await expect(isLauncherEnabled(options.dataHome)).resolves.toBe(false);
      await expect(exists(join(folder, 'data/icons/hicolor/16x16/apps/emusic.png'))).resolves.toBe(false);
    });
  });
});

describe('launcher offer', () => {
  it('was not made until it is marked, and stays marked', async () => {
    const folder = await createFolder('emusic-offer-');
    const userData = join(folder, 'userData');

    await expect(wasLauncherOffered(userData)).resolves.toBe(false);
    await markLauncherOffered(userData);
    await markLauncherOffered(userData);

    await expect(wasLauncherOffered(userData)).resolves.toBe(true);
    await rm(folder, { recursive: true, force: true });
  });
});
