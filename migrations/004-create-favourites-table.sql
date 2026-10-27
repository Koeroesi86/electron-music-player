-- A favourite is identified by where it comes from and what it is, so a new source (a mounted drive, another online service)
-- is a new `source` value and needs no new table: `source` is 'local' or 'radio' today, `kind` is 'track', 'album' or 'station',
-- `id` is the id in that source (the path of a track, the uuid of a station) and `snapshot` is the JSON to show the item
-- when its source no longer has it.
CREATE TABLE IF NOT EXISTS favourites (
  source TEXT NOT NULL,
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  snapshot TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (source, kind, id)
);

CREATE INDEX IF NOT EXISTS favourites_added_at ON favourites (added_at);
