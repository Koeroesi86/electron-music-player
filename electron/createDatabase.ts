import fs from 'fs';
import path from 'path';
import type { Database } from 'sqlite3';
import executeQueries from './executeQueries';
import connectDatabase from './connectDatabase';

const migrationsPath = path.resolve(__dirname, '../../migrations');
const createQueries = fs.readdirSync(migrationsPath, 'utf8').map((migration) => ({
  query: fs.readFileSync(path.resolve(migrationsPath, migration), 'utf8'),
  variables: [],
}));

const createDatabase = (libraryLocation: string): Promise<Database> =>
  connectDatabase(libraryLocation).then((database) => executeQueries(database, createQueries).then(() => database));

export default createDatabase;
