import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { rateLimit } from 'express-rate-limit';
import { resolveAlbumArt } from './albumArt';
import { findTrackPath, getLibrary } from './libraryRepository';
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

const serveLibrary = (request: Request, response: Response) => {
  allowLoopbackOrigin(request, response);
  if (!global._database) {
    response.sendStatus(403);
    return;
  }

  getLibrary(global._database)
    .then((library) => response.json(library))
    .catch(() => response.sendStatus(500));
};

function setupServer() {
  const server = express();

  server.use(limiter);
  server.use('/app', express.static(path.resolve(__dirname, '../../build')));
  server.use('/albumart/:albumArt', serveAlbumArt);
  server.get('/local', serveLocalFile);
  server.get('/library', serveLibrary);

  server.listen(global._port, '127.0.0.1', () => {
    console.log(`Example app listening on port ${global._port}!`);
  });
}

export default setupServer;
