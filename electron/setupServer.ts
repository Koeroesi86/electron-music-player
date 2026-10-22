import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { rateLimit } from 'express-rate-limit';
import { resolveAlbumArt } from './albumArt';
import type { Database } from 'sqlite3';
import { createRadioStreamHandler } from './radioProxy';
import type { RadioStreamDeps } from './radioProxy';
import { findTrackPath, getAlbumPage, getAlbumTracks, getLibrary, getTrackPage } from './libraryRepository';
import { allowLoopbackOrigin, sendFile } from './sendFile';

// audio streaming issues many range requests, so the limit only guards against runaway loops
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 6000 });

const serveAlbumArt = (request: Request, response: Response) => {
  const basename = path.basename(String(request.params.albumArt));

  resolveAlbumArt(basename)
    .then((albumArt) => (albumArt ? sendFile(albumArt, request, response) : response.sendStatus(404)))
    .catch((err) =>
      response.status(500).send(`
            Can't generate optimized file from ${path.join(global._appDataPath, './albumart/', basename)}
            ${err}
          `)
    );
};

const serveLocalFile = (request: Request, response: Response) => {
  const { path: filePath } = request.query;

  if (typeof filePath !== 'string' || !filePath || !global._database) {
    response.sendStatus(404);
    return;
  }

  // only files of the library are served, the path comes from the database and not from the request
  findTrackPath(global._database, filePath)
    .then((trackPath) => (trackPath ? sendFile(trackPath, request, response) : response.sendStatus(404)))
    .catch(() => response.sendStatus(500));
};

const maxPageSize = 500;

const toInteger = (value: unknown, fallback: number) => (typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : fallback);

/** Answers with the result of a query on the library, the library is not served before the database is connected */
const serveFromLibrary = (query: (database: Database, request: Request) => Promise<unknown> | undefined) => (request: Request, response: Response) => {
  allowLoopbackOrigin(request, response);
  if (!global._database) {
    response.sendStatus(403);
    return;
  }

  const result = query(global._database, request);
  if (!result) {
    response.sendStatus(400);
    return;
  }

  result.then((body) => response.json(body)).catch(() => response.sendStatus(500));
};

const toWindow = (request: Request) => ({
  offset: toInteger(request.query.offset, 0),
  limit: Math.min(Math.max(toInteger(request.query.limit, 100), 1), maxPageSize),
});

const serveLibrary = serveFromLibrary((database) => getLibrary(database));

const serveTrackPage = serveFromLibrary((database, request) => {
  const { offset, limit } = toWindow(request);
  return getTrackPage(database, offset, limit);
});

const serveAlbumPage = serveFromLibrary((database, request) => {
  const { offset, limit } = toWindow(request);
  return getAlbumPage(database, offset, limit);
});

const serveAlbumTracks = serveFromLibrary((database, { query }) =>
  typeof query.path === 'string' && typeof query.title === 'string' ? getAlbumTracks(database, query.path, query.title) : undefined
);

function setupServer(radio: RadioStreamDeps) {
  const server = express();

  server.use(limiter);
  server.use('/app', express.static(path.resolve(__dirname, '../../build')));
  server.use('/albumart/:albumArt', serveAlbumArt);
  server.get('/local', serveLocalFile);
  server.get('/library', serveLibrary);
  server.get('/radio/:uuid', createRadioStreamHandler(radio));
  server.get('/library/tracks', serveTrackPage);
  server.get('/library/albums', serveAlbumPage);
  server.get('/library/album', serveAlbumTracks);

  server.listen(global._port, '127.0.0.1', () => {
    console.log(`Example app listening on port ${global._port}!`);
  });
}

export default setupServer;
