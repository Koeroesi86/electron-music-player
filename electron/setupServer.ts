import express from 'express';
import type { Response } from 'express';
import path from 'path';
import fs from 'fs';
import mimeType from 'mime-types';
import sharp from 'sharp';
import executeQuery from './executeQuery';
import type { Track } from '../types/library';

const server = express();

const sendFile = (filePath: string, response: Response, range = '') => {
  const mime = mimeType.contentType(path.resolve(filePath));
  if (!mime) {
    response.status(500).send(`contentType failed`);
    return;
  }
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
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
  server.use('/app', express.static(path.resolve(__dirname, '../../build')));
  server.use('/albumart/:albumArt', (request, response) => {
    const albumArt = String(request.params.albumArt);
    const basename = path.basename(albumArt);
    const current = path.join(global._appDataPath, './albumart/', basename);
    if (fs.existsSync(current)) {
      sendFile(current, response);
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
            sendFile(current, response);
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

    if (typeof filePath === 'string' && filePath) {
      sendFile(filePath, response, request.headers.range);
    } else {
      response.status(404);
    }
  });

  server.get('/library', (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
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

  server.listen(global._port, () => {
    console.log(`Example app listening on port ${global._port}!`);
  });
}

export default setupServer;
