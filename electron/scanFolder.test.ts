import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { WebContents } from 'electron';
import type { Database } from 'sqlite3';
import scanFolder from './scanFolder';
import { createTestDatabase } from './test-database';

describe('scanFolder', () => {
  let database: Database;
  let root: string;
  const send = vi.fn();
  const sender = { send } as unknown as WebContents;
  const scanningFiles = () => send.mock.calls.filter(([channel]) => channel === 'SCANNING_FILE').map(([, payload]) => payload);

  beforeEach(async () => {
    send.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'emusic-scan-'));
    database = await createTestDatabase();
    global._database = database;
    global._appDataPath = root;
  });

  afterEach(() => {
    global._database = undefined;
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('counts only the supported audio files', async () => {
    fs.writeFileSync(path.join(root, 'a.mp3'), 'not audio');
    fs.mkdirSync(path.join(root, 'sub'));
    fs.writeFileSync(path.join(root, 'sub', 'b.flac'), 'not audio');
    fs.writeFileSync(path.join(root, 'cover.jpg'), 'image');
    fs.writeFileSync(path.join(root, 'notes.txt'), 'text');

    await scanFolder(root, sender);

    expect(scanningFiles()).toEqual([expect.objectContaining({ progress: 0, totalCount: 2 }), expect.objectContaining({ progress: 1, totalCount: 2 })]);
  });

  it('starts clean after a scan that failed', async () => {
    await expect(scanFolder(path.join(root, 'missing'), sender)).rejects.toThrow();
    fs.writeFileSync(path.join(root, 'a.mp3'), 'not audio');

    await scanFolder(root, sender);

    expect(scanningFiles()).toEqual([expect.objectContaining({ progress: 0, totalCount: 1 })]);
  });
});
