import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Database } from 'sqlite3';
import { createTestDatabase } from './test-database';

// net.fetch of a file slices it for a range, and answers 200 without a Content-Range or a Content-Length
vi.mock('electron', () => ({
  protocol: { registerSchemesAsPrivileged: vi.fn(), handle: vi.fn() },
  net: {
    fetch: async (url: string, { headers }: { headers: Record<string, string> }) => {
      const data = fs.readFileSync(fileURLToPath(url));
      const range = headers.range?.match(/^bytes=(\d+)-(\d+)$/);
      return new Response(range ? data.subarray(Number(range[1]), Number(range[2]) + 1) : data, { headers: { 'Content-Type': 'audio/flac' } });
    },
  },
}));

const { handleTrackRequest } = await import('./trackProtocol');

describe('handleTrackRequest', () => {
  let database: Database | undefined;
  let folder: string;
  const libraryFile = () => path.join(folder, 'library.flac');
  const request = (file: string, headers?: Record<string, string>) =>
    handleTrackRequest(() => database)(new Request(`emusic://track?path=${encodeURIComponent(file)}`, { headers }));

  beforeAll(async () => {
    folder = fs.mkdtempSync(path.join(os.tmpdir(), 'emusic-protocol-'));
    fs.writeFileSync(libraryFile(), '0123456789');
    fs.writeFileSync(path.join(folder, 'secret.txt'), 'secret');
    database = await createTestDatabase();
    await new Promise<void>((resolve, reject) =>
      database?.run('INSERT INTO library (path) VALUES (?)', [libraryFile()], (err) => (err ? reject(err) : resolve()))
    );
  });

  afterAll(() => fs.rmSync(folder, { recursive: true, force: true }));

  it('serves a file of the library with its size', async () => {
    const response = await request(libraryFile());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-length')).toBe('10');
    expect(await response.text()).toBe('0123456789');
  });

  it('answers a range with 206, its Content-Range and its length', async () => {
    const response = await request(libraryFile(), { range: 'bytes=2-4' });

    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe('bytes 2-4/10');
    expect(response.headers.get('content-length')).toBe('3');
    expect(await response.text()).toBe('234');
  });

  it('answers a range that can not be satisfied with 416', async () => {
    const response = await request(libraryFile(), { range: 'bytes=20-30' });

    expect(response.status).toBe(416);
    expect(response.headers.get('content-range')).toBe('bytes */10');
  });

  it('does not serve a file outside of the library', async () => {
    expect((await request(path.join(folder, 'secret.txt'))).status).toBe(404);
  });

  it('does not serve before the database is connected', async () => {
    expect((await handleTrackRequest(() => undefined)(new Request(`emusic://track?path=${encodeURIComponent(libraryFile())}`))).status).toBe(404);
  });
});
