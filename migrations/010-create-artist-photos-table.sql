-- The photo of an artist or album artist, by the name as the library compares it (the artist_key and album_artist_key of 006 and 009).
-- picture is the file in the albumart folder, NULL when the lookup found no photo; checkedAt (ms) tells when to look again.
CREATE TABLE IF NOT EXISTS artist_photos (
  key TEXT PRIMARY KEY,
  picture TEXT,
  checkedAt INTEGER NOT NULL
);
