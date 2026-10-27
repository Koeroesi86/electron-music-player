import classNames from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay } from '@fortawesome/free-solid-svg-icons';
import type { AlbumSummary } from '../../types/library';
import { isOffline } from '../../client/offline-folders';
import { useTranslation } from '../../client/i18n';
import style from './AlbumViewThumbnail.scss';
import Time from '../time';
import { getCoverUrl } from '../../client/cover-url';
import { albumFavourite } from '../../client/favourites';
import FavouriteButton from '../favourite-button';
import AddToPlaylist from '../add-to-playlist';

interface AlbumViewThumbnailProps {
  album: AlbumSummary;
  offlineFolders: string[];
  selectAlbum: (album: AlbumSummary) => void;
  playAlbum: (album: AlbumSummary) => void;
}

const AlbumViewThumbnail = ({ album, offlineFolders, selectAlbum, playAlbum }: AlbumViewThumbnailProps) => {
  const { t } = useTranslation();
  const offline = isOffline(`${album.path}/`, offlineFolders);

  return (
    <div
      title={offline ? t('folders.offlineHint') : undefined}
      className={classNames(style.albumViewThumbnail, { [style.offline]: offline })}
      onClick={() => selectAlbum(album)}
      onDoubleClick={() => playAlbum(album)}
      onTouchEnd={() => playAlbum(album)}
    >
      <div title={album.title} className={style.cover} style={album.cover ? { backgroundImage: `url("${getCoverUrl(album.cover)}")` } : undefined}>
        <FavouriteButton item={albumFavourite(album)} className={style.favourite} />
        <AddToPlaylist source={album} className={style.playlist} />
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
};

export default AlbumViewThumbnail;
