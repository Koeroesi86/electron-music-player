import path from 'path';
import type { Database } from 'sqlite3';
import connectDatabase from './connectDatabase';
import { migrate } from './migrate';

const migrationsPath = path.resolve(__dirname, '../../migrations');

const createDatabase = (libraryLocation: string): Promise<Database> =>
  connectDatabase(libraryLocation).then((database) => migrate(database, migrationsPath).then(() => database));

export default createDatabase;
