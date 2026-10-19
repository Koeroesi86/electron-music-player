import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';
import type { Database } from 'sqlite3';
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
    baseUrl = `http://localhost:${global._port}`;
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
});
