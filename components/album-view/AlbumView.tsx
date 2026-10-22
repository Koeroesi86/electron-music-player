import { useCallback } from 'react';
import type { Album, AlbumSummary, Track } from '../../types/library';
import { useScrollSeparator } from '../../client/hooks/use-scroll-separator';
import { usePageLoader } from '../../client/hooks/use-page-loader';
import { useWindowedList } from '../../client/hooks/use-windowed-list';
import { fetchAlbum } from '../../client/library-api';
import { getCachedItem } from '../../client/redux/library/pages';
import type { PageCache } from '../../client/redux/library/pages';
import style from './AlbumView.scss';
import AlbumViewThumbnail from '../album-view-thumbnail';

/** The size of a thumbnail with its margin in px, matching .albumViewThumbnail in AlbumViewThumbnail.scss */
const itemWidth = 112;
const rowHeight = 160;

interface AlbumViewProps {
  albums: PageCache<AlbumSummary>;
  port: string;
  playTracks: (tracks: Track[]) => void;
  selectAlbum: (album: Album | null) => void;
  loadPage: (page: number) => void;
}

const AlbumView = ({ playTracks, selectAlbum, albums, port, loadPage }: AlbumViewProps) => {
  const { separator, listing: scrolled } = useScrollSeparator(style.scrolled);
  const { listing, columns, firstIndex, lastIndex, offsetTop, height } = useWindowedList({ itemCount: albums.total ?? 0, rowHeight, itemWidth });
  usePageLoader(albums, firstIndex, lastIndex, loadPage);

  const setListing = useCallback(
    (element: HTMLDivElement | null) => {
      listing.current = element;
      scrolled.current = element;
    },
    [listing, scrolled]
  );

  // the tracks of an album are fetched when it is opened or played, the listing has the albums only
  const openAlbum = useCallback((album: AlbumSummary) => fetchAlbum(album, port).then(selectAlbum).catch(console.error), [port, selectAlbum]);
  const playAlbum = useCallback(
    (album: AlbumSummary) =>
      fetchAlbum(album, port)
        .then(({ tracks }) => playTracks(tracks))
        .catch(console.error),
    [port, playTracks]
  );

  const rows = Array.from({ length: Math.ceil((lastIndex - firstIndex) / columns) }, (_, row) =>
    Array.from({ length: Math.min(columns, lastIndex - firstIndex - row * columns) }, (__, column) => firstIndex + row * columns + column)
  );

  return (
    <div className={style.albums}>
      <div ref={separator} className={style.separator} />
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
    </div>
  );
};

export default AlbumView;
