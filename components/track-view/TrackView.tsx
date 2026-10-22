import { useCallback, useState } from 'react';
import type { Track } from '../../types/library';
import { useScrollSeparator } from '../../client/hooks/use-scroll-separator';
import style from './TrackView.scss';
import TrackViewItem from '../track-view-item';
import type { TrackLabels } from '../track-view-item/TrackViewItem';

interface TrackViewProps {
  tracks: Track[];
  currentSong: Track | null;
  loaded: boolean;
  playTracks: (tracks: Track[]) => void;
}

const headerLabels: TrackLabels = {
  duration: 'Duration',
  artist: 'Artist',
  year: 'Year',
  album: 'Album',
  track: '#',
  title: 'Title',
};

const TrackView = ({ currentSong, playTracks, tracks, loaded }: TrackViewProps) => {
  const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);
  const { separator, listing } = useScrollSeparator(style.scrolled);

  const toggleTrack = useCallback(
    (track: Track) => setSelectedTracks((selected) => (selected.includes(track) ? selected.filter((item) => item !== track) : [...selected, track])),
    []
  );

  const doubleClickTrack = useCallback(
    (track: Track) => {
      playTracks([track]);
      setSelectedTracks([track]);
    },
    [playTracks]
  );

  return (
    <div className={style.tracks}>
      <TrackViewItem track={headerLabels} isHeader />
      <div ref={separator} className={style.separator} />
      <div className={style.listing} ref={listing}>
        {loaded &&
          tracks.map((track) => (
            <TrackViewItem
              key={track.path}
              track={track}
              isSelected={selectedTracks.includes(track)}
              isCurrent={currentSong?.path === track.path}
              clickTrack={toggleTrack}
              doubleClickTrack={doubleClickTrack}
            />
          ))}
      </div>
      <div className={style.controls}>
        <button onClick={() => setSelectedTracks([])}>Clear selection</button>
        <button onClick={() => setSelectedTracks(tracks)}>Select All</button>
        <button onClick={() => playTracks(selectedTracks)}>Play selected</button>
      </div>
    </div>
  );
};

export default TrackView;
