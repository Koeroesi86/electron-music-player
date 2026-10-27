-- What was played, one row per item with the time it was played last, so playing it again moves it to the top of the list.
-- The columns are those of `favourites` (see 004): `source` is 'local' or 'radio' today, `kind` is 'track' or 'station',
-- `id` is the id in that source and `snapshot` is the JSON to show the item when its source no longer has it.
CREATE TABLE IF NOT EXISTS history (
  source TEXT NOT NULL,
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  snapshot TEXT NOT NULL,
  played_at INTEGER NOT NULL,
  PRIMARY KEY (source, kind, id)
);

CREATE INDEX IF NOT EXISTS history_played_at ON history (played_at);
