import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import mimeType from 'mime-types';
import sharp from 'sharp';
import { rateLimit } from 'express-rate-limit';
import executeQuery from './executeQuery';
import type { Track } from '../types/library';

const server = express();

// the renderer is served from this server, or from the dev server on another port
const loopbackOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const allowLoopbackOrigin = (request: Request, response: Response) => {
  response.setHeader('Vary', 'Origin');
  const { origin } = request.headers;
  if (origin && loopbackOrigin.test(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
};

// audio streaming issues many range requests, so the limit only guards against runaway loops
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 6000 });

const pipeFile = (filePath: string, response: Response, options?: { start: number; end: number }) => {
  const file = fs.createReadStream(filePath, options);
  // the file can vanish after the library scan, and the response may already be streaming
  file.on('error', () => (response.headersSent ? response.destroy() : response.sendStatus(404)));
  response.on('close', () => file.destroy());
  file.pipe(response);
};

/** Resolve a single `bytes=start-end` or `bytes=-suffix` range, undefined when it cannot be satisfied */
const parseRange = (range: string, fileSize: number) => {
  const parts = range.match(/^bytes=(\d*)-(\d*)$/);
  if (!parts || (parts[1] === '' && parts[2] === '')) return undefined;
  const start = parts[1] === '' ? Math.max(fileSize - parseInt(parts[2], 10), 0) : parseInt(parts[1], 10);
  const end = parts[1] === '' || parts[2] === '' ? fileSize - 1 : Math.min(parseInt(parts[2], 10), fileSize - 1);
  return start <= end && start < fileSize ? { start, end } : undefined;
};

const optimizing = new Map<string, Promise<void>>();

/** Resize the album art into the optimized file; requests for the same file share one run and never see a half written file */
const optimizeAlbumArt = (source: string, target: string) => {
  const running = optimizing.get(target);
  if (running) return running;

  const partial = `${target}.part`;
  const job = sharp(source)
    .resize(250, 250, { fit: 'inside' })
    .png({ compressionLevel: 9, force: true })
    .toFile(partial)
    .then(() => fs.promises.rename(partial, target))
    .then(() => undefined)
    .finally(() => optimizing.delete(target));
  optimizing.set(target, job);
  return job;
};

const sendRange = (filePath: string, range: string, response: Response) =>
  fs.stat(filePath, (error, stat) => {
    if (error) {
      response.sendStatus(404);
      return;
    }
    const bounds = parseRange(range, stat.size);
    if (!bounds) {
      response.setHeader('Content-Range', `bytes */${stat.size}`);
      response.sendStatus(416);
      return;
    }
    response.setHeader('Content-Range', `bytes ${bounds.start}-${bounds.end}/${stat.size}`);
    response.setHeader('Accept-Ranges', 'bytes');
    response.setHeader('Content-Length', bounds.end - bounds.start + 1);
    response.status(206);
    pipeFile(filePath, response, bounds);
  });

const sendFile = (filePath: string, request: Request, response: Response) => {
  const mime = mimeType.contentType(path.resolve(filePath));
  if (!mime) {
    response.status(500).send(`contentType failed`);
    return;
  }
  allowLoopbackOrigin(request, response);
  response.setHeader('Content-Type', mime);

  if (/^image\//.test(mime)) response.setHeader('Cache-Control', 'Public');
  if (/^image\//.test(mime) || !request.headers.range) pipeFile(filePath, response);
  else sendRange(filePath, request.headers.range, response);
};

/** The stored album art of a request; the optimized copy is generated from the original when it does not exist yet */
const resolveAlbumArt = async (basename: string) => {
  const folder = path.join(global._appDataPath, './albumart/');
  const current = path.join(folder, basename);
  if (fs.existsSync(current)) return current;
  if (!/-optimized/.test(basename)) return undefined;

  const fileName = basename.replace(/-optimized/, '').replace(path.extname(basename), '');
  const files = await fs.promises.readdir(folder);
  const original = files.find((file) => file.indexOf(fileName) === 0 && !file.includes('-optimized') && !file.endsWith('.part'));
  if (!original) return undefined;

  await optimizeAlbumArt(path.join(folder, original), current);
  return current;
};

function setupServer() {
  server.use(limiter);
  server.use('/app', express.static(path.resolve(__dirname, '../../build')));
  server.use('/albumart/:albumArt', (request, response) => {
    const basename = path.basename(String(request.params.albumArt));

    resolveAlbumArt(basename)
      .then((albumArt) => (albumArt ? sendFile(albumArt, request, response) : response.sendStatus(404)))
      .catch((err) =>
        response.status(500).send(`
            Can't generate optimized file from ${path.join(global._appDataPath, './albumart/', basename)}
            ${err}
          `)
      );
  });

  server.get('/local', (request, response) => {
    const { path: filePath } = request.query;

    if (typeof filePath !== 'string' || !filePath || !global._database) {
      response.sendStatus(404);
      return;
    }

    // only files of the library are served, the path comes from the database and not from the request
    executeQuery<Pick<Track, 'path'>>(global._database, {
      query: `SELECT path FROM library WHERE path = ?`,
      variables: [filePath],
    })
      .then(([track]) => (track ? sendFile(track.path, request, response) : response.sendStatus(404)))
      .catch(() => response.sendStatus(500));
  });

  server.get('/library', (request, response) => {
    allowLoopbackOrigin(request, response);
    if (!global._database) {
      response.sendStatus(403);
      return;
    }

    executeQuery<Track>(global._database, {
      query: `SELECT * FROM library ORDER BY path ASC`,
      variables: [],
    })
      .then((library) => response.json(library))
      .catch(() => response.sendStatus(500));
  });

  server.listen(global._port, '127.0.0.1', () => {
    console.log(`Example app listening on port ${global._port}!`);
  });
}

export default setupServer;
