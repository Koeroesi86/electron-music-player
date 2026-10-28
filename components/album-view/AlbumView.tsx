import { useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Album, AlbumSummary, Folder, Track } from '../../types/library';
import type { AlbumSort as AlbumSortValue } from '../../types/library-query';
import { useTranslation } from '../../client/i18n';
import { useScrollSeparator } from '../../client/hooks/use-scroll-separator';
import { usePageLoader } from '../../client/hooks/use-page-loader';
import { useWindowedList } from '../../client/hooks/use-windowed-list';
import { fetchAlbum } from '../../client/library-api';
import { getCachedItem } from '../../client/redux/library/pages';
import type { PageCache } from '../../client/redux/library/pages';
import style from './AlbumView.scss';
import AlbumViewThumbnail from '../album-view-thumbnail';
import AlbumSort from '../album-sort';
import { selectedFolders } from '../../client/library-query';

/** The size of a thumbnail with its margin in px, matching .albumViewThumbnail in AlbumViewThumbnail.scss */
const itemWidth = 112;
const rowHeight = 160;

interface AlbumViewProps {
  albums: PageCache<AlbumSummary>;
  /** The sort of the list and the folders it is limited to, the selection can hold a folder the library no longer has */
  sort: AlbumSortValue | undefined;
  selected: string[];
  folders: Folder[];
  /** The text the albums are searched for, undefined is no search */
  search: string | undefined;
  playTracks: (tracks: Track[]) => void;
  selectAlbum: (album: Album | null) => void;
  loadPage: (page: number) => void;
  /** What the bar above the list holds, the sort of the albums when omitted */
  toolbar?: ReactNode;
}

const AlbumView = ({ playTracks, selectAlbum, albums, sort, selected, folders, search, loadPage, toolbar = <AlbumSort /> }: AlbumViewProps) => {
  const { t } = useTranslation();
  const { separator, listing: scrolled } = useScrollSeparator(style.scrolled);
  const { listing, columns, firstIndex, lastIndex, offsetTop, height } = useWindowedList({ itemCount: albums.total ?? 0, rowHeight, itemWidth });
  usePageLoader(albums, firstIndex, lastIndex, loadPage);

  const queryKey = JSON.stringify([sort, selectedFolders(selected, folders), search]);
  // another sort, other folders or another search are another list, which starts from its top
  useEffect(() => {
    if (listing.current) listing.current.scrollTop = 0;
  }, [listing, queryKey]);

  const setListing = useCallback(
    (element: HTMLDivElement | null) => {
      listing.current = element;
      scrolled.current = element;
    },
    [listing, scrolled]
  );

  // the tracks of an album are fetched when it is opened or played, the listing has the albums only
  const openAlbum = useCallback((album: AlbumSummary) => fetchAlbum(album).then(selectAlbum).catch(console.error), [selectAlbum]);
  const playAlbum = useCallback(
    (album: AlbumSummary) =>
      fetchAlbum(album)
        .then(({ tracks }) => playTracks(tracks))
        .catch(console.error),
    [playTracks]
  );

  const rows = Array.from({ length: Math.ceil((lastIndex - firstIndex) / columns) }, (_, row) =>
    Array.from({ length: Math.min(columns, lastIndex - firstIndex - row * columns) }, (__, column) => firstIndex + row * columns + column)
  );

  return (
    <div className={style.albums}>
      <div className={style.toolbar}>{toolbar}</div>
      <div ref={separator} className={style.separator} />
      {search && albums.total === 0 && <div className={style.empty}>{t('library.noResults', { search })}</div>}
      <div className={style.listing} ref={setListing}>
        <div className={style.window} style={{ height, paddingTop: offsetTop }}>
          {rows.map((indexes) => (
            <div key={indexes[0]} className={style.row}>
              {indexes.map((index) => {
                const album = getCachedItem(albums, index);
                return album ? (
                  <AlbumViewThumbnail key={album.id} album={album} selectAlbum={openAlbum} playAlbum={playAlbum} />
                ) : (
                  <div key={index} className={style.placeholder} />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className={style.footer}>{t('albums.count', { count: albums.total ?? 0 })}</div>
    </div>
  );
};

export default AlbumView;
