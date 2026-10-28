-- What a file is encoded as, for the badge of the player (FLAC 24/96, MP3 320).
-- The scanner fills them, rows from before are NULL until the next scan or rescan reads the files again.
ALTER TABLE library ADD COLUMN codec TEXT;
ALTER TABLE library ADD COLUMN bitDepth INTEGER;
ALTER TABLE library ADD COLUMN sampleRate INTEGER;
ALTER TABLE library ADD COLUMN bitrate INTEGER;
ALTER TABLE library ADD COLUMN vbr INTEGER;
ALTER TABLE library ADD COLUMN lossless INTEGER;
