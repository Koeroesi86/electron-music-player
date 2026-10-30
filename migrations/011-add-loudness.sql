-- The ReplayGain of a file, in dB, and its peak as a ratio of full scale (1 is 0 dBFS), for the loudness normalization of the player.
-- The scanner fills them from the tags; NULL is a file without the tag.
ALTER TABLE library ADD COLUMN trackGain REAL;
ALTER TABLE library ADD COLUMN albumGain REAL;
ALTER TABLE library ADD COLUMN trackPeak REAL;
ALTER TABLE library ADD COLUMN albumPeak REAL;
-- The scan skips a folder whose modification time is not newer than the stored one, so the stored times are reset and every folder is scanned once, in the background.
UPDATE folders SET lastModified = 0;
