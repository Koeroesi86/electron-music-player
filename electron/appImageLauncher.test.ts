import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDesktopEntry, disableLauncher, enableLauncher, isLauncherEnabled, readLauncherTarget, syncLauncher } from './appImageLauncher';
import type { LauncherOptions } from './appImageLauncher';

const sizes = [16, 24, 32, 48, 64, 128, 256, 512];

describe('buildDesktopEntry', () => {
  it('starts the AppImage and groups the window with the entry', () => {
    const entry = buildDesktopEntry('/home/me/Apps/eMusic-26.10.1.AppImage');

    expect(entry).toContain('Exec="/home/me/Apps/eMusic-26.10.1.AppImage" %U');
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
    folder = await mkdtemp(join(tmpdir(), 'emusic-launcher-'));
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
    expect(refresh).toHaveBeenCalledExactlyOnceWith(join(folder, 'data/applications'));
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
