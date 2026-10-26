import { useCallback, useMemo, useState } from 'react';
import type { Track } from '../../types/library';
import { useTranslation } from '../../client/i18n';
import { useScrollSeparator } from '../../client/hooks/use-scroll-separator';
import { usePageLoader } from '../../client/hooks/use-page-loader';
import { useWindowedList } from '../../client/hooks/use-windowed-list';
import { fetchLibrary } from '../../client/library-api';
import { getCachedItem } from '../../client/redux/library/pages';
import type { PageCache } from '../../client/redux/library/pages';
import style from './TrackView.scss';
import TrackViewItem from '../track-view-item';
import type { TrackLabels } from '../track-view-item/TrackViewItem';

/** The height of a row in px, matching .trackViewItem in TrackViewItem.scss */
const rowHeight = 20;

interface TrackViewProps {
  tracks: PageCache<Track>;
  currentSong: Track | null;
  port: string;
  playTracks: (tracks: Track[]) => void;
  loadPage: (page: number) => void;
}

const TrackView = ({ currentSong, playTracks, tracks, port, loadPage }: TrackViewProps) => {
  const { t } = useTranslation();
  const headerLabels = useMemo<TrackLabels>(
    () => ({
      duration: t('tracks.duration'),
      artist: t('tracks.artist'),
      year: t('tracks.year'),
      album: t('tracks.album'),
      track: '#',
      title: t('tracks.title'),
    }),
    [t]
  );
  const [selectedTracks, setSelectedTracks] = useState<Map<string, Track>>(new Map());
  const { separator, listing: scrolled } = useScrollSeparator(style.scrolled);
  const { listing, firstIndex, lastIndex, offsetTop, height } = useWindowedList({ itemCount: tracks.total ?? 0, rowHeight });
  const setListing = useCallback(
    (element: HTMLDivElement | null) => {
      listing.current = element;
      scrolled.current = element;
    },
    [listing, scrolled]
  );
  usePageLoader(tracks, firstIndex, lastIndex, loadPage);

  const toggleTrack = useCallback(
    (track: Track) =>
      setSelectedTracks((selected) => {
        const next = new Map(selected);
        if (!next.delete(track.path)) next.set(track.path, track);
        return next;
      }),
    []
  );

  const doubleClickTrack = useCallback(
    (track: Track) => {
      playTracks([track]);
      setSelectedTracks(new Map([[track.path, track]]));
    },
    [playTracks]
  );

  // the pages that are not fetched yet are not in the cache, the whole library is fetched for the selection
  const selectAll = () =>
    fetchLibrary(port)
      .then((library) => setSelectedTracks(new Map(library.map((track) => [track.path, track]))))
      .catch(console.error);

  return (
    <div className={style.tracks}>
      <TrackViewItem track={headerLabels} isHeader />
      <div ref={separator} className={style.separator} />
      <div className={style.listing} ref={setListing}>
        <div className={style.window} style={{ height, paddingTop: offsetTop }}>
          {Array.from({ length: lastIndex - firstIndex }, (_, offset) => {
            const track = getCachedItem(tracks, firstIndex + offset);
            return track ? (
              <TrackViewItem
                key={track.path}
                track={track}
                isSelected={selectedTracks.has(track.path)}
                isCurrent={currentSong?.path === track.path}
                clickTrack={toggleTrack}
                doubleClickTrack={doubleClickTrack}
              />
            ) : (
              <div key={firstIndex + offset} className={style.placeholder} />
            );
          })}
        </div>
      </div>
      <div className={style.controls}>
        <button onClick={() => setSelectedTracks(new Map())}>{t('tracks.clearSelection')}</button>
        <button onClick={selectAll}>{t('tracks.selectAll')}</button>
        <button onClick={() => playTracks([...selectedTracks.values()])}>{t('tracks.playSelected')}</button>
      </div>
    </div>
  );
};

export default TrackView;
