import fs from 'fs';
import path from 'path';
import type { Database } from 'sqlite3';
import executeQuery from './executeQuery';

const migrationName = /^(\d+)-.+\.sql$/;

const exec = (database: Database, query: string) =>
  new Promise<void>((resolve, reject) => {
    database.exec(query, (err) => (err ? reject(err) : resolve()));
  });

const readMigrations = (folder: string) => {
  const migrations = fs
    .readdirSync(folder, 'utf8')
    .map((file) => ({ file, version: Number(migrationName.exec(file)?.[1]), query: fs.readFileSync(path.resolve(folder, file), 'utf8') }))
    .sort((a, b) => a.version - b.version);

  const invalid = migrations.find(({ version }, index) => !version || version === migrations[index - 1]?.version);
  if (invalid) throw new Error(`${invalid.file} is not named like 004-name.sql with a number that no other migration has`);

  return migrations;
};

// the version is stored with the data, so a failed migration leaves both as they were
const apply = async (database: Database, { version, query }: { version: number; query: string }) => {
  await exec(database, 'BEGIN');
  try {
    await exec(database, `${query}\n;\nPRAGMA user_version = ${version};`);
    await exec(database, 'COMMIT');
  } catch (error) {
    await exec(database, 'ROLLBACK').catch(() => undefined);
    throw error;
  }
};

/**
 * Applies the migrations of the folder that the database has not seen, each one once and in the order of their number.
 * A database that predates the version (0) gets all of them, so 001 to 003, which ran on every start before, have to stay safe to run again
 */
export const migrate = async (database: Database, folder: string) => {
  const [{ user_version: current }] = await executeQuery<{ user_version: number }>(database, { query: 'PRAGMA user_version', variables: [] });

  await readMigrations(folder)
    .filter(({ version }) => version > current)
    .reduce((previous, migration) => previous.then(() => apply(database, migration)), Promise.resolve());
};
