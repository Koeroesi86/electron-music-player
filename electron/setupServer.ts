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

const sendFile = (filePath: string, request: Request, response: Response) => {
  const range = request.headers.range ?? '';
  const mime = mimeType.contentType(path.resolve(filePath));
  if (!mime) {
    response.status(500).send(`contentType failed`);
    return;
  }
  allowLoopbackOrigin(request, response);
  response.setHeader('Content-Type', mime);
  if (/^image\//.test(mime)) {
    response.setHeader('Cache-Control', 'Public');
    fs.createReadStream(filePath).pipe(response);
  } else if (range !== '') {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const parts = range.match(/bytes=([0-9]+)-([0-9]*)/);
    const start = parseInt(parts?.[1] ?? '0', 10);
    const end = parts?.[2] ? parseInt(parts[2], 10) : fileSize - 1;
    const file = fs.createReadStream(filePath, { start, end });
    response.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    response.setHeader('Accept-Ranges', 'bytes');
    response.setHeader('Content-Length', end - start + 1);
    response.status(206);
    file.pipe(response);
  } else {
    fs.createReadStream(filePath).pipe(response);
  }
};

function setupServer() {
  server.use(limiter);
  server.use('/app', express.static(path.resolve(__dirname, '../../build')));
  server.use('/albumart/:albumArt', (request, response) => {
    const albumArt = String(request.params.albumArt);
    const basename = path.basename(albumArt);
    const current = path.join(global._appDataPath, './albumart/', basename);
    if (fs.existsSync(current)) {
      sendFile(current, request, response);
    } else if (/-optimized/.test(basename)) {
      const fileName = basename.replace(/-optimized/, '').replace(path.extname(basename), '');
      const suspectedFile = fs.readdirSync(path.resolve(global._appDataPath, './albumart')).find((file) => file.indexOf(fileName) === 0);

      if (suspectedFile) {
        const toOptimize = path.join(global._appDataPath, './albumart/', suspectedFile);
        sharp(toOptimize)
          .resize(250, 250, { fit: 'inside' })
          .png({ compressionLevel: 9, force: true })
          .toFile(current)
          .then((info) => {
            sendFile(current, request, response);
          })
          .catch((err) =>
            response.status(500).send(`
              Can't generate optimized file from ${current}
              ${err}
            `)
          );
      }
    } else {
      response.sendStatus(404);
    }
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
    if (global._database) {
      executeQuery<Track>(global._database, {
        query: `SELECT * FROM library ORDER BY path ASC`,
        variables: [],
      }).then((library) => {
        response.json(library);
      });
    } else {
      response.status(403);
    }
  });

  server.listen(global._port, '127.0.0.1', () => {
    console.log(`Example app listening on port ${global._port}!`);
  });
}

export default setupServer;
