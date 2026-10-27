-- The text a column is sorted by: the value without case and accents, which SQLite can not compare itself (its lower() and NOCASE know ASCII only).
-- addTrack fills them, rows from before are NULL until backfillSortKeys fills them at start (NULL sorts as empty, last).
ALTER TABLE library ADD COLUMN title_key TEXT;
ALTER TABLE library ADD COLUMN artist_key TEXT;
ALTER TABLE library ADD COLUMN album_key TEXT;
