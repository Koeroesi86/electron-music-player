import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Folder, Track } from '../../types/library';
import { cycleSort } from '../../types/library-query';
import type { TrackSort, TrackSortField } from '../../types/library-query';
import { useTranslation } from '../../client/i18n';
import { useScrollSeparator } from '../../client/hooks/use-scroll-separator';
import { usePageLoader } from '../../client/hooks/use-page-loader';
import { useWindowedList } from '../../client/hooks/use-windowed-list';
import { fetchLibrary } from '../../client/library-api';
import { selectedFolders } from '../../client/library-query';
import { getCachedItem } from '../../client/redux/library/pages';
import type { PageCache } from '../../client/redux/library/pages';
import { isOffline } from '../../client/offline-folders';
import style from './TrackView.scss';
import TrackViewItem from '../track-view-item';
import type { TrackLabels } from '../track-view-item/TrackViewItem';

/** The height of a row in px, matching .trackViewItem in TrackViewItem.scss */
const rowHeight = 20;

interface TrackViewProps {
  tracks: PageCache<Track>;
  currentSong: Track | null;
  offlineFolders: string[];
  /** The sort of the list, undefined is the default order */
  sort: TrackSort | undefined;
  /** The selected folders and the folders of the library, the selection can hold a folder the library no longer has */
  selected: string[];
  folders: Folder[];
  playTracks: (tracks: Track[]) => void;
  loadPage: (page: number) => void;
  setSort: (sort: TrackSort | undefined) => void;
}

const TrackView = ({ currentSong, playTracks, tracks, offlineFolders, sort, selected, folders, loadPage, setSort }: TrackViewProps) => {
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

  const folderSelection = selectedFolders(selected, folders);
  const query = { sort, folders: folderSelection };
  const queryKey = JSON.stringify(query);
  // another sort or other folders are another list, which starts from its top
  useEffect(() => {
    if (listing.current) listing.current.scrollTop = 0;
  }, [listing, queryKey]);

  const sortBy = useCallback((field: TrackSortField) => setSort(cycleSort(sort, field)), [setSort, sort]);

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
    fetchLibrary(query)
      .then((library) => setSelectedTracks(new Map(library.map((track) => [track.path, track]))))
      .catch(console.error);

  return (
    <div className={style.tracks}>
      <TrackViewItem track={headerLabels} isHeader sort={sort} onSort={sortBy} />
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
                isOffline={isOffline(track.path, offlineFolders)}
                clickTrack={toggleTrack}
                doubleClickTrack={doubleClickTrack}
              />
            ) : (
              <div key={firstIndex + offset} className={style.placeholder} />
            );
          })}
        </div>
      </div>
      <div className={style.footer}>
        <span className={style.count}>{t('tracks.count', { count: tracks.total ?? 0 })}</span>
        <div className={style.controls}>
          <button onClick={() => setSelectedTracks(new Map())}>{t('tracks.clearSelection')}</button>
          <button onClick={selectAll}>{t('tracks.selectAll')}</button>
          <button onClick={() => playTracks([...selectedTracks.values()])}>{t('tracks.playSelected')}</button>
        </div>
      </div>
    </div>
  );
};

export default TrackView;
