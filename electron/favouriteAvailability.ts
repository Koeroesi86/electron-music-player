import type { Database } from 'sqlite3';
import type { FavouriteKey } from '../types/favourites';
import type { RadioBrowser } from './radioBrowser';
import { findTrackPath, getAlbumTracks } from './libraryRepository';

/** What tells whether an item is available: where it comes from and what it looked like */
type Keyed = FavouriteKey & { snapshot: unknown };

interface AvailabilityContext {
  database: Database;
  radio: Pick<RadioBrowser, 'findStations'>;
}

/** The items of one source and kind that the source no longer has */
type MissingFinder = (favourites: Keyed[], context: AvailabilityContext) => Promise<Keyed[]>;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const hasTracks = async ({ snapshot }: Keyed, { database }: AvailabilityContext) =>
  isRecord(snapshot) && typeof snapshot.path === 'string' && typeof snapshot.title === 'string'
    ? (await getAlbumTracks(database, snapshot.path, snapshot.title)).length > 0
    : false;

const missingTracks: MissingFinder = async (favourites, { database }) =>
  (await Promise.all(favourites.map(async ({ id }) => (await findTrackPath(database, id)) === undefined))).flatMap((missing, index) =>
    missing ? [favourites[index]] : []
  );

const missingAlbums: MissingFinder = async (favourites, context) =>
  (await Promise.all(favourites.map((favourite) => hasTracks(favourite, context)))).flatMap((found, index) => (found ? [] : [favourites[index]]));

// a directory that does not answer says nothing about the stations, so none of them is reported missing
const missingStations: MissingFinder = async (favourites, { radio }) =>
  radio
    .findStations(favourites.map(({ id }) => id))
    .then((stations) => favourites.filter(({ id }) => !stations.some(({ uuid }) => uuid === id)))
    .catch(() => []);

/** A new source is a new entry here; a favourite of a source that is not listed is taken as available, because nothing can tell */
const missingFinders: Record<string, MissingFinder> = {
  'local/track': missingTracks,
  'local/album': missingAlbums,
  'radio/station': missingStations,
};

const typeOf = ({ source, kind }: Keyed) => `${source}/${kind}`;

/** The favourites or the history items, each with whether its source still has it */
export const withAvailability = async <T extends Keyed>(favourites: T[], context: AvailabilityContext) => {
  const missing = (
    await Promise.all(
      [...new Set(favourites.map(typeOf))].map(
        (type) =>
          missingFinders[type]?.(
            favourites.filter((favourite) => typeOf(favourite) === type),
            context
          ) ?? []
      )
    )
  ).flat();

  return favourites.map((favourite) => ({ ...favourite, available: !missing.includes(favourite) }));
};
