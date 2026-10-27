import classNames from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay } from '@fortawesome/free-solid-svg-icons';
import type { AlbumSummary } from '../../types/library';
import style from './AlbumViewThumbnail.scss';
import Time from '../time';
import { getCoverUrl } from '../../client/cover-url';
import { albumFavourite } from '../../client/favourites';
import FavouriteButton from '../favourite-button';

interface AlbumViewThumbnailProps {
  album: AlbumSummary;
  port: string;
  selectAlbum: (album: AlbumSummary) => void;
  playAlbum: (album: AlbumSummary) => void;
}

const AlbumViewThumbnail = ({ album, port, selectAlbum, playAlbum }: AlbumViewThumbnailProps) => (
  <div className={style.albumViewThumbnail} onClick={() => selectAlbum(album)} onDoubleClick={() => playAlbum(album)} onTouchEnd={() => playAlbum(album)}>
    <div title={album.title} className={style.cover} style={album.cover ? { backgroundImage: `url("${getCoverUrl(port, album.cover)}")` } : undefined}>
      <FavouriteButton item={albumFavourite(album)} className={style.favourite} />
      <div className={style.overlay}>
        <div
          className={classNames(style.metaData, style.icon)}
          onClick={(e) => {
            e.stopPropagation();
            playAlbum(album);
          }}
        >
          <FontAwesomeIcon icon={faPlay} size="sm" />
        </div>
      </div>
    </div>
    <div className={style.meta}>
      <div className={classNames(style.title)} title={album.title}>
        {album.title}
      </div>
      <div className={classNames(style.artist)} title={album.artist}>
        {album.artist}
      </div>
      <div className={classNames(style.duration)}>
        <Time seconds={album.duration} />
      </div>
    </div>
  </div>
);

export default AlbumViewThumbnail;
