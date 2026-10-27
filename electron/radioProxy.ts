import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import type { Request, Response } from 'express';
import { IcyMetadataStripper } from './icyMetadata';
import { allowLoopbackOrigin } from './sendFile';

export interface RadioStreamDeps {
  /** The address of the stream of a station */
  resolveStream: (uuid: string) => Promise<string>;
  onTitle: (uuid: string, title: string, streamUrl?: string) => void;
}

const stationUuid = /^[0-9a-zA-Z-]{1,64}$/;

const streamTo = async (uuid: string, response: Response, signal: AbortSignal, { resolveStream, onTitle }: RadioStreamDeps) => {
  const upstream = await fetch(await resolveStream(uuid), { headers: { 'Icy-MetaData': '1' }, signal });
  if (!upstream.ok || !upstream.body) throw new Error(`The stream answered ${upstream.status}`);

  response.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'audio/mpeg');
  response.setHeader('Cache-Control', 'no-store');

  const metaint = Number(upstream.headers.get('icy-metaint'));
  const strippers = metaint > 0 ? [new IcyMetadataStripper(metaint, (title, streamUrl) => onTitle(uuid, title, streamUrl))] : [];

  await pipeline([Readable.from(upstream.body), ...strippers, response]);
};

/** Plays a station through the local server: the browser gets the audio with the CORS headers the equalizer and the spectrum need, and without the ICY metadata */
export const createRadioStreamHandler = (deps: RadioStreamDeps) => (request: Request, response: Response) => {
  const uuid = String(request.params.uuid);
  if (!stationUuid.test(uuid)) {
    response.sendStatus(404);
    return;
  }

  allowLoopbackOrigin(request, response);
  const abort = new AbortController();
  response.on('close', () => abort.abort());

  streamTo(uuid, response, abort.signal, deps).catch(() => (response.headersSent ? response.destroy() : response.sendStatus(502)));
};
