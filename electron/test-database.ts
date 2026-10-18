import sqlite3 from 'sqlite3'
import fs from 'fs'
import path from 'path'
import executeQueries from './executeQueries'

const migrationsPath = path.resolve(__dirname, '../migrations')

/** In-memory database with all migrations applied */
export const createTestDatabase = (): Promise<sqlite3.Database> =>
  new Promise<sqlite3.Database>((resolve, reject) => {
    const database = new sqlite3.Database(':memory:', err => err ? reject(err) : resolve(database))
  }).then(database => executeQueries(
    database,
    fs.readdirSync(migrationsPath).map(file => ({
      query: fs.readFileSync(path.resolve(migrationsPath, file), 'utf8'),
      variables: []
    }))
  ).then(() => database))
