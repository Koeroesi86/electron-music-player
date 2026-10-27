import { net, protocol } from 'electron';
import { stat } from 'fs/promises';
import { pathToFileURL } from 'url';
import type { Database } from 'sqlite3';
import { findTrackPath } from './libraryRepository';
import { parseRange } from './sendFile';

const trackScheme = 'emusic';

/** Has to run before the app is ready */
export const registerTrackScheme = () =>
  protocol.registerSchemesAsPrivileged([
    { scheme: trackScheme, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } },
  ]);

// the page is still served from the loopback port, so the response needs the headers a cross origin <audio crossorigin> asks for
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges' };

const notFound = () => new Response(undefined, { status: 404, headers: corsHeaders });

/** Serves `emusic://track?path=<library path>`: only a file of the library, with the range of the request forwarded to the file */
export const handleTrackRequest = (getDatabase: () => Database | undefined) => async (request: Request) => {
  const { hostname, searchParams } = new URL(request.url);
  const database = getDatabase();
  const filePath = searchParams.get('path');
  if (hostname !== 'track' || !filePath || !database) return notFound();

  const trackPath = await findTrackPath(database, filePath);
  if (!trackPath) return notFound();

  const { size } = await stat(trackPath).catch(() => ({ size: undefined }));
  if (size === undefined) return notFound();

  const range = request.headers.get('range');
  const bounds = range ? parseRange(range, size) : undefined;
  if (range && !bounds) return new Response(undefined, { status: 416, headers: { ...corsHeaders, 'Content-Range': `bytes */${size}` } });

  // net.fetch slices the file for a range but answers 200 without a Content-Range, which an <audio> element can not seek with
  const file = await net.fetch(pathToFileURL(trackPath).href, { headers: range ? { range } : {} });
  // without a Content-Length the media pipeline can not tell the size of the file and does not seek
  const headers = {
    ...Object.fromEntries(file.headers),
    ...corsHeaders,
    'Accept-Ranges': 'bytes',
    'Content-Length': String(bounds ? bounds.end - bounds.start + 1 : size),
  };

  return bounds
    ? new Response(file.body, { status: 206, headers: { ...headers, 'Content-Range': `bytes ${bounds.start}-${bounds.end}/${size}` } })
    : new Response(file.body, { status: file.status, headers });
};

export const handleTrackProtocol = (getDatabase: () => Database | undefined) => protocol.handle(trackScheme, handleTrackRequest(getDatabase));
