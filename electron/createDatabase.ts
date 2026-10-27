import path from 'path';
import type { Database } from 'sqlite3';
import connectDatabase from './connectDatabase';
import { migrate } from './migrate';
import { backupLibrary } from './backupLibrary';
import backfillSortKeys from './backfillSortKeys';

const migrationsPath = path.resolve(__dirname, '../../migrations');

const createDatabase = (libraryLocation: string): Promise<Database> =>
  connectDatabase(libraryLocation).then((database) =>
    migrate(database, migrationsPath, { beforeApply: (version) => backupLibrary(database, libraryLocation, version) })
      .then(() => backfillSortKeys(database))
      .then(() => database)
  );

export default createDatabase;
