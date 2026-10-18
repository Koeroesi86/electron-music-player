import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Database } from 'sqlite3'
import type { Track } from '../types/library'
import addTrack from './addTrack'
import executeQuery from './executeQuery'
import { createTestDatabase } from './test-database'

const track: Track = {
  path: '/music/album/01.flac',
  artist: 'Artist',
  album: 'Album',
  title: 'Title',
  year: 2020,
  track: 1,
  disk: 1,
  genre: 'Rock',
  picture: 'cover.jpg',
  duration: 123.5
}

const selectLibrary = (database: Database) =>
  executeQuery<Track>(database, { query: 'SELECT * FROM library ORDER BY path', variables: [] })

describe('addTrack', () => {
  let database: Database

  beforeEach(async () => {
    database = await createTestDatabase()
  })

  afterEach(() => {
    database.close()
  })

  it('stores every field of the track', async () => {
    await addTrack(database, track)

    const [stored] = await selectLibrary(database)
    expect(stored).toMatchObject({
      path: track.path,
      artist: 'Artist',
      album: 'Album',
      title: 'Title',
      genre: 'Rock',
      picture: 'cover.jpg',
      duration: 123.5
    })
    expect(`${stored.year}`).toBe('2020')
  })

  it('replaces an existing track with the same path', async () => {
    await addTrack(database, track)
    await addTrack(database, { ...track, title: 'Renamed' })

    const library = await selectLibrary(database)
    expect(library).toHaveLength(1)
    expect(library[0].title).toBe('Renamed')
  })

  it('accepts a track without picture and duration', async () => {
    await addTrack(database, { ...track, picture: null, duration: null })

    const [stored] = await selectLibrary(database)
    expect(stored.picture).toBeNull()
    expect(stored.duration).toBeNull()
  })
})
