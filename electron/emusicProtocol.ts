import path from 'path';
import { protocol } from 'electron';
import type { Database } from 'sqlite3';
import { resolveAlbumArt } from './albumArt';
import { findTrackPath } from './libraryRepository';
import { libraryRoutes } from './libraryRoutes';
import { serveRadio } from './radioProtocol';
import type { RadioStreamDeps } from './radioProxy';
import type { RadioArtImage } from './radioArt';
import { notFound, serveFile } from './serveFile';

const scheme = 'emusic';
const host = 'app';

/** The page and everything it asks for is served from this origin, so no request is cross-origin */
export const emusicOrigin = `${scheme}://${host}`;

/** Has to run before the app is ready */
export const registerEmusicScheme = () =>
  protocol.registerSchemesAsPrivileged([{ scheme, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }]);

export interface EmusicDeps {
  getDatabase: () => Database | undefined;
  radio: RadioStreamDeps & { getArt?: (key: string) => RadioArtImage | undefined };
  /** The folder of the built page */
  appRoot: string;
  /** The origin of the dev server, the page of a development run is not served from here and asks across origins */
  devOrigin?: string;
}

const artKey = /^[0-9a-f]{16}$/;

const pageFile = (appRoot: string, pathname: string) => {
  const file = path.resolve(appRoot, `.${pathname === '/' ? '/index.html' : decodeURIComponent(pathname)}`);
  return file.startsWith(appRoot + path.sep) ? file : undefined;
};

const route = async (request: Request, { getDatabase, radio, appRoot }: EmusicDeps) => {
  const { pathname, searchParams } = new URL(request.url);
  if (Object.hasOwn(libraryRoutes, pathname)) return libraryRoutes[pathname](getDatabase(), searchParams);

  if (pathname === '/track') {
    const database = getDatabase();
    const filePath = searchParams.get('path');
    // only files of the library are served, the path comes from the database and not from the request
    const trackPath = database && filePath ? await findTrackPath(database, filePath) : undefined;
    return trackPath ? serveFile(trackPath, request) : notFound();
  }

  const [, kind, name] = pathname.match(/^\/(albumart|radio-art|radio)\/([^/]+)$/) ?? [];
  const key = name && decodeURIComponent(name);
  if (kind === 'radio') return serveRadio(key, request.signal, radio);
  if (kind === 'radio-art') {
    const art = artKey.test(key) ? radio.getArt?.(key) : undefined;
    return art ? new Response(new Uint8Array(art.data), { headers: { 'Content-Type': art.type, 'Cache-Control': 'max-age=3600' } }) : notFound();
  }
  if (kind === 'albumart') {
    const albumArt = await resolveAlbumArt(path.basename(key));
    return albumArt ? serveFile(albumArt, request, { 'Cache-Control': 'Public' }) : notFound();
  }

  const file = pageFile(appRoot, pathname);
  return file ? serveFile(file, request) : notFound();
};

const allowDevOrigin = (request: Request, response: Response, devOrigin?: string) => {
  if (!devOrigin || request.headers.get('origin') !== devOrigin) return response;

  response.headers.set('Access-Control-Allow-Origin', devOrigin);
  response.headers.set('Access-Control-Allow-Headers', 'Range, Content-Type');
  response.headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  response.headers.set('Vary', 'Origin');
  return response;
};

export const handleEmusicRequest = (deps: EmusicDeps) => async (request: Request) => {
  if (new URL(request.url).hostname !== host) return notFound();
  if (request.method === 'OPTIONS') return allowDevOrigin(request, new Response(undefined, { status: 204 }), deps.devOrigin);
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(undefined, { status: 405 });

  const response = await route(request, deps).catch(() => new Response(undefined, { status: 500 }));
  return allowDevOrigin(request, response, deps.devOrigin);
};

export const handleEmusicProtocol = (deps: EmusicDeps) => protocol.handle(scheme, handleEmusicRequest(deps));
