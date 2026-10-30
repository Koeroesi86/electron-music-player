-- The ReplayGain of a file, in dB, and its peak as a ratio of full scale (1 is 0 dBFS), for the loudness normalization of the player.
-- The scanner fills them from the tags; NULL is a file without the tag. Rows with tags get them at the next scan, which compares all the fields it reads.
ALTER TABLE library ADD COLUMN trackGain REAL;
ALTER TABLE library ADD COLUMN albumGain REAL;
ALTER TABLE library ADD COLUMN trackPeak REAL;
ALTER TABLE library ADD COLUMN albumPeak REAL;
