import classNames from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay } from '@fortawesome/free-solid-svg-icons';
import type { Album, Track } from '../../types/library';
import style from './AlbumViewThumbnail.scss';
import Time from '../time';
import { getCoverUrl } from '../../client/cover-url';

interface AlbumViewThumbnailProps {
  album: Album;
  port: string;
  selectAlbum: (album: Album) => void;
  playTracks: (tracks: Track[]) => void;
}

const AlbumViewThumbnail = ({ album, port, selectAlbum, playTracks }: AlbumViewThumbnailProps) => (
  <div
    className={style.albumViewThumbnail}
    onClick={() => selectAlbum(album)}
    onDoubleClick={() => playTracks(album.tracks)}
    onTouchEnd={() => playTracks(album.tracks)}
  >
    <div title={album.title} className={style.cover} style={album.cover ? { backgroundImage: `url("${getCoverUrl(port, album.cover)}")` } : undefined}>
      <div className={style.overlay}>
        <div
          className={classNames(style.metaData, style.icon)}
          onClick={(e) => {
            e.stopPropagation();
            playTracks(album.tracks);
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
