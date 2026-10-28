-- The album artist (the artist the album is listed under, which is not the artist of every track of a compilation) and the keys the library is browsed by:
-- the value without case, accents and the space around it, like the sort keys of 006. addTrack fills them.
-- genre_key is filled for the tracks from before by backfillSortKeys at start, album artist and its key are empty until the next scan or rescan reads the files again.
ALTER TABLE library ADD COLUMN albumArtist TEXT;
ALTER TABLE library ADD COLUMN album_artist_key TEXT NOT NULL DEFAULT '';
ALTER TABLE library ADD COLUMN genre_key TEXT NOT NULL DEFAULT '';

-- The browse lists group the tracks by these
CREATE INDEX IF NOT EXISTS library_artist_key ON library (artist_key);
CREATE INDEX IF NOT EXISTS library_album_artist_key ON library (album_artist_key);
CREATE INDEX IF NOT EXISTS library_genre_key ON library (genre_key);
