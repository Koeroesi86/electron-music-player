-- The playlists a user made, in the order they are listed in (`position`, counted from 0).
CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- The tracks of a playlist in their order (`position`, counted from 0). A track can be in a playlist more than once, so an entry has an id of its own.
-- `path` is the path of the track in the library, `snapshot` is the JSON of the track to show it when the library no longer has it.
-- Foreign keys are not enforced by the connection, so deleting a playlist deletes its entries too (see playlistRepository).
-- Radio stations are not kept in a playlist, they have no file and the directory can change them.
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  path TEXT NOT NULL,
  snapshot TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS playlist_tracks_playlist ON playlist_tracks (playlist_id, position);
