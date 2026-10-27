import express from 'express';
import type { Express, Request, Response } from 'express';
import { createServer } from 'http';
import path from 'path';
import { rateLimit } from 'express-rate-limit';
import { resolveAlbumArt } from './albumArt';
import type { Database } from 'sqlite3';
import { createRadioStreamHandler } from './radioProxy';
import type { RadioStreamDeps } from './radioProxy';
import { findTrackPath, getAlbumPage, getAlbumTracks, getLibrary, getTrackPage } from './libraryRepository';
import { parseAlbumSort, parseFolders, parseTrackSort } from '../types/library-query';
import type { LibraryQuery } from '../types/library-query';
import type { RadioArtImage } from './radioArt';
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

const artKey = /^[0-9a-f]{16}$/;

const serveRadioArt = (getArt: RadioServerDeps['getArt']) => (request: Request, response: Response) => {
  const key = String(request.params.key);
  const art = artKey.test(key) ? getArt?.(key) : undefined;
  if (!art) {
    response.sendStatus(404);
    return;
  }

  response.type(art.type).setHeader('Cache-Control', 'max-age=3600');
  response.send(art.data);
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

/** The sort and the folders of a request; a sort that is not a known field with a known direction is no query at all */
const toLibraryQuery = <S>(request: Request, parse: (field: unknown, direction: unknown) => S | undefined): LibraryQuery<S> | undefined => {
  const { sort, dir, folder } = request.query;
  const parsed = sort === undefined ? undefined : parse(sort, dir);

  return sort !== undefined && !parsed ? undefined : { sort: parsed, folders: parseFolders(folder === undefined ? [] : [folder].flat()) };
};

const serveLibrary = serveFromLibrary((database, request) => {
  const query = toLibraryQuery(request, parseTrackSort);
  return query && getLibrary(database, query);
});

const serveTrackPage = serveFromLibrary((database, request) => {
  const { offset, limit } = toWindow(request);
  const query = toLibraryQuery(request, parseTrackSort);
  return query && getTrackPage(database, offset, limit, query);
});

const serveAlbumPage = serveFromLibrary((database, request) => {
  const { offset, limit } = toWindow(request);
  const query = toLibraryQuery(request, parseAlbumSort);
  return query && getAlbumPage(database, offset, limit, query);
});

const serveAlbumTracks = serveFromLibrary((database, { query }) =>
  typeof query.path === 'string' && typeof query.title === 'string' ? getAlbumTracks(database, query.path, query.title) : undefined
);

/** The radio stream handler's dependencies, and the art the stations' songs were found with */
export type RadioServerDeps = RadioStreamDeps & { getArt?: (key: string) => RadioArtImage | undefined };

const defaultPort = 3000;
const maxPortAttempts = 100;

// a probe of a free port can be taken before the server binds it, so the bind itself decides; the next port is tried when it is occupied
const listenOnFreePort = (server: Express, port: number, attempt = 1): Promise<number> =>
  new Promise<number>((resolve, reject) => {
    // not app.listen: Express 5 also calls its callback with a bind error
    const listener = createServer(server);
    listener.once('listening', () => resolve(port));
    listener.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'EADDRINUSE' || attempt >= maxPortAttempts) return reject(err);

      resolve(listenOnFreePort(server, port + 1, attempt + 1));
    });
    listener.listen(port, '127.0.0.1');
  });

function setupServer(radio: RadioServerDeps, startPort = defaultPort) {
  const server = express();

  server.use(limiter);
  server.use('/app', express.static(path.resolve(__dirname, '../../build')));
  server.use('/albumart/:albumArt', serveAlbumArt);
  server.get('/local', serveLocalFile);
  server.get('/library', serveLibrary);
  server.get('/radio-art/:key', serveRadioArt(radio.getArt));
  server.get('/radio/:uuid', createRadioStreamHandler(radio));
  server.get('/library/tracks', serveTrackPage);
  server.get('/library/albums', serveAlbumPage);
  server.get('/library/album', serveAlbumTracks);

  return listenOnFreePort(server, startPort).then((port) => {
    global._port = port;
    console.log(`Example app listening on port ${port}!`);
    return port;
  });
}

export default setupServer;
