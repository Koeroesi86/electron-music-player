import type { Album, Track } from '../../types/library';
import { useScrollSeparator } from '../../client/hooks/use-scroll-separator';
import style from './AlbumView.scss';
import AlbumViewThumbnail from '../album-view-thumbnail';

interface AlbumViewProps {
  loaded: boolean;
  albums: Album[];
  playTracks: (tracks: Track[]) => void;
  selectAlbum: (album: Album | null) => void;
}

const AlbumView = ({ playTracks, selectAlbum, loaded, albums }: AlbumViewProps) => {
  const { separator, listing } = useScrollSeparator(style.scrolled);

  return (
    <div className={style.albums}>
      <div ref={separator} className={style.separator} />
      <div className={style.listing} ref={listing}>
        {loaded && albums.map((album) => <AlbumViewThumbnail key={album.id} album={album} selectAlbum={selectAlbum} playTracks={playTracks} />)}
      </div>
    </div>
  );
};

export default AlbumView;
