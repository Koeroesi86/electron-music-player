import type { Database } from 'sqlite3';
import { getAlbumPage, getAlbumTracks, getLibrary, getTrackPage } from './libraryRepository';
import { parseAlbumSort, parseFolders, parseTrackSort } from '../types/library-query';
import type { LibraryQuery } from '../types/library-query';

const maxPageSize = 500;

const toInteger = (value: string | null, fallback: number) => (value !== null && /^\d+$/.test(value) ? Number(value) : fallback);

const toWindow = (params: URLSearchParams) => ({
  offset: toInteger(params.get('offset'), 0),
  limit: Math.min(Math.max(toInteger(params.get('limit'), 100), 1), maxPageSize),
});

/** The sort and the folders of a request; a sort that is not a known field with a known direction is no query at all */
const toLibraryQuery = <S>(params: URLSearchParams, parse: (field: unknown, direction: unknown) => S | undefined): LibraryQuery<S> | undefined => {
  const sort = params.get('sort');
  const parsed = sort === null ? undefined : parse(sort, params.get('dir') ?? undefined);

  return sort !== null && !parsed ? undefined : { sort: parsed, folders: parseFolders(params.getAll('folder')) };
};

type Query = (database: Database, params: URLSearchParams) => Promise<unknown> | undefined;

/** Answers with the result of a query on the library, the library is not served before the database is connected */
const fromLibrary =
  (query: Query) =>
  (database: Database | undefined, params: URLSearchParams): Promise<Response> => {
    if (!database) return Promise.resolve(new Response(undefined, { status: 403 }));

    const result = query(database, params);
    if (!result) return Promise.resolve(new Response(undefined, { status: 400 }));

    return result.then(
      (body) => Response.json(body),
      () => new Response(undefined, { status: 500 })
    );
  };

export const libraryRoutes: Record<string, ReturnType<typeof fromLibrary>> = {
  '/library': fromLibrary((database, params) => {
    const query = toLibraryQuery(params, parseTrackSort);
    return query && getLibrary(database, query);
  }),
  '/library/tracks': fromLibrary((database, params) => {
    const { offset, limit } = toWindow(params);
    const query = toLibraryQuery(params, parseTrackSort);
    return query && getTrackPage(database, offset, limit, query);
  }),
  '/library/albums': fromLibrary((database, params) => {
    const { offset, limit } = toWindow(params);
    const query = toLibraryQuery(params, parseAlbumSort);
    return query && getAlbumPage(database, offset, limit, query);
  }),
  '/library/album': fromLibrary((database, params) => {
    const folder = params.get('path');
    const title = params.get('title');
    return folder !== null && title !== null ? getAlbumTracks(database, folder, title) : undefined;
  }),
};
