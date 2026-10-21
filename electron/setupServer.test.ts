import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';
import type { Database } from 'sqlite3';
import sharp from 'sharp';
import setupServer from './setupServer';
import { createTestDatabase } from './test-database';

const getFreePort = () =>
  new Promise<number>((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, () => {
      const address = probe.address();
      probe.close(() => (address && typeof address === 'object' ? resolve(address.port) : reject(new Error('no port'))));
    });
  });

describe('setupServer /local', () => {
  let database: Database;
  let folder: string;
  let baseUrl: string;
  const libraryFile = () => path.join(folder, 'library.flac');
  const otherFile = () => path.join(folder, 'secret.txt');
  const request = (file: string) => fetch(`${baseUrl}/local?path=${encodeURIComponent(file)}`);

  beforeAll(async () => {
    folder = fs.mkdtempSync(path.join(os.tmpdir(), 'emusic-server-'));
    fs.writeFileSync(libraryFile(), 'audio');
    fs.writeFileSync(otherFile(), 'secret');
    database = await createTestDatabase();
    await new Promise<void>((resolve, reject) =>
      database.run('INSERT INTO library (path) VALUES (?)', [libraryFile()], (err) => (err ? reject(err) : resolve()))
    );
    global._database = database;
    global._appDataPath = folder;
    global._port = await getFreePort();
    baseUrl = `http://127.0.0.1:${global._port}`;
    setupServer();
  });

  afterAll(() => {
    global._database = undefined;
    fs.rmSync(folder, { recursive: true, force: true });
  });

  it('serves a file of the library', async () => {
    const response = await request(libraryFile());
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('audio');
  });

  it('does not serve a file outside of the library', async () => {
    expect((await request(otherFile())).status).toBe(404);
  });

  it('does not serve a path that traverses out of the library', async () => {
    expect((await request(path.join(folder, '..', path.basename(folder), 'secret.txt'))).status).toBe(404);
  });

  describe('cross-origin access', () => {
    const fromOrigin = (origin: string) => fetch(`${baseUrl}/library`, { headers: { origin } });

    it.each(['http://localhost:8080', 'http://127.0.0.1:3000'])('allows the loopback origin %s', async (origin) => {
      expect((await fromOrigin(origin)).headers.get('access-control-allow-origin')).toBe(origin);
    });

    it.each(['https://example.com', 'http://localhost.example.com', 'http://192.168.0.2:3000'])('does not allow the origin %s', async (origin) => {
      expect((await fromOrigin(origin)).headers.get('access-control-allow-origin')).toBeNull();
    });
  });

  describe('range requests', () => {
    const ranged = (range: string) => fetch(`${baseUrl}/local?path=${encodeURIComponent(libraryFile())}`, { headers: { range } });

    it('serves a byte range', async () => {
      const response = await ranged('bytes=1-2');
      expect(response.status).toBe(206);
      expect(response.headers.get('content-range')).toBe('bytes 1-2/5');
      expect(await response.text()).toBe('ud');
    });

    it('serves a suffix range', async () => {
      const response = await ranged('bytes=-2');
      expect(response.status).toBe(206);
      expect(await response.text()).toBe('io');
    });

    it('clamps an end past the file', async () => {
      const response = await ranged('bytes=3-100');
      expect(response.headers.get('content-range')).toBe('bytes 3-4/5');
    });

    it.each(['bytes=10-20', 'bytes=-', 'bytes=3-1', 'items=0-1'])('rejects the unsatisfiable range %s', async (range) => {
      const response = await ranged(range);
      expect(response.status).toBe(416);
      expect(response.headers.get('content-range')).toBe('bytes */5');
    });

    it('answers 404 when the file vanished after the scan', async () => {
      const missing = path.join(folder, 'missing.flac');
      await new Promise<void>((resolve, reject) => database.run('INSERT INTO library (path) VALUES (?)', [missing], (err) => (err ? reject(err) : resolve())));
      expect((await request(missing)).status).toBe(404);
      expect((await fetch(`${baseUrl}/local?path=${encodeURIComponent(missing)}`, { headers: { range: 'bytes=0-1' } })).status).toBe(404);
    });
  });

  it('answers 404 for an optimized album art without a source image', async () => {
    fs.mkdirSync(path.join(folder, 'albumart'), { recursive: true });
    expect((await fetch(`${baseUrl}/albumart/nothing-optimized.png`)).status).toBe(404);
  });

  it('answers concurrent requests for an optimized album art with the complete image', async () => {
    const albumArt = path.join(folder, 'albumart');
    fs.mkdirSync(albumArt, { recursive: true });
    await sharp({ create: { width: 1200, height: 1200, channels: 3, background: 'red' } })
      .png()
      .toFile(path.join(albumArt, 'concurrent-abc.png'));

    const responses = await Promise.all(Array.from({ length: 8 }, () => fetch(`${baseUrl}/albumart/concurrent-abc-optimized.png`)));
    const sizes = await Promise.all(
      responses.map(async (response) => {
        const { width } = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
        return { status: response.status, width };
      })
    );

    expect(sizes).toEqual(Array.from({ length: 8 }, () => ({ status: 200, width: 250 })));
    expect(fs.readdirSync(albumArt).filter((file) => file.endsWith('.part'))).toEqual([]);
  });

  it('answers with the library', async () => {
    const response = await fetch(`${baseUrl}/library`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.arrayContaining([expect.objectContaining({ path: libraryFile() })]));
  });
});
