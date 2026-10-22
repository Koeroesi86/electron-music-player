import { EventEmitter } from 'events';
import { describe, expect, it, vi } from 'vitest';
import { createMockUpdateSource, runUpdate } from './updater';
import type { UpdateSource } from './updater';

const createSource = (check: UpdateSource['checkForUpdates'], download: UpdateSource['downloadUpdate'] = () => Promise.resolve()) => {
  const source: UpdateSource = Object.assign(new EventEmitter(), {
    autoDownload: true,
    checkForUpdates: vi.fn(check),
    downloadUpdate: vi.fn(download),
    quitAndInstall: vi.fn(),
  });

  return source;
};

const available = () => Promise.resolve({ isUpdateAvailable: true, updateInfo: { version: '2.0.0' } });

describe('runUpdate', () => {
  it('continues when there is no update', async () => {
    const source = createSource(() => Promise.resolve({ isUpdateAvailable: false, updateInfo: { version: '1.0.0' } }));
    const report = vi.fn();

    await expect(runUpdate(source, report)).resolves.toBe('continue');

    expect(report).toHaveBeenCalledWith({ text: 'Checking for updates...' });
    expect(source.downloadUpdate).not.toHaveBeenCalled();
    expect(source.quitAndInstall).not.toHaveBeenCalled();
  });

  it('downloads the update, reports the progress and installs it', async () => {
    const source = createSource(available, () => {
      source.emit('download-progress', { percent: 42.4 });
      return Promise.resolve();
    });
    const report = vi.fn();

    await expect(runUpdate(source, report)).resolves.toBe('restarting');

    expect(source.autoDownload).toBe(false);
    expect(report.mock.calls.map(([progress]) => progress)).toEqual([
      { text: 'Checking for updates...' },
      { text: 'Downloading update 2.0.0...', percent: 0 },
      { text: 'Downloading update 2.0.0...', percent: 42 },
      { text: 'Restarting to install the update...', percent: 100 },
    ]);
    expect(source.quitAndInstall).toHaveBeenCalledOnce();
  });

  it('does not install when installing is turned off', async () => {
    const source = createSource(available);

    await expect(runUpdate(source, vi.fn(), { install: false })).resolves.toBe('continue');

    expect(source.downloadUpdate).toHaveBeenCalledOnce();
    expect(source.quitAndInstall).not.toHaveBeenCalled();
  });

  it.each([
    ['the check fails', () => Promise.reject(new Error('offline'))],
    ['the check does not answer in time', () => new Promise<never>(() => undefined)],
  ])('continues when %s', async (_name, check) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(runUpdate(createSource(check), vi.fn(), { checkTimeout: 1 })).resolves.toBe('continue');
  });

  it('continues when the download fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const source = createSource(available, () => Promise.reject(new Error('disk full')));

    await expect(runUpdate(source, vi.fn())).resolves.toBe('continue');

    expect(source.quitAndInstall).not.toHaveBeenCalled();
  });
});

describe('createMockUpdateSource', () => {
  it('goes through a whole update without installing anything', async () => {
    const report = vi.fn();

    await expect(runUpdate(createMockUpdateSource(0), report, { install: false })).resolves.toBe('continue');

    const percents = report.mock.calls.map(([progress]) => progress.percent).filter((percent) => percent !== undefined);
    expect(percents).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  });
});
