import fs from 'fs';
import path from 'path';
import mimeType from 'mime-types';
import type { Request, Response } from 'express';

// the renderer is served from this server, or from the dev server on another port
const loopbackOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export const allowLoopbackOrigin = (request: Request, response: Response) => {
  response.setHeader('Vary', 'Origin');
  const { origin } = request.headers;
  if (origin && loopbackOrigin.test(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
};

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

export const sendFile = (filePath: string, request: Request, response: Response) => {
  const mime = mimeType.contentType(path.resolve(filePath));
  if (!mime) {
    response.status(500).send(`contentType failed`);
    return;
  }
  allowLoopbackOrigin(request, response);
  response.setHeader('Content-Type', mime);

  const isImage = /^image\//.test(mime);
  if (isImage) response.setHeader('Cache-Control', 'Public');
  if (isImage || !request.headers.range) pipeFile(filePath, response);
  else sendRange(filePath, request.headers.range, response);
};
