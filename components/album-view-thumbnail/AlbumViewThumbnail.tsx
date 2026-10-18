import { PureComponent } from 'react';
import classNames from 'classnames';
import { basename, extname } from 'path';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay } from '@fortawesome/free-solid-svg-icons';
import type { Album, Track } from '../../types/library';
import style from './AlbumViewThumbnail.scss';
import Time from '../time';

interface AlbumViewThumbnailProps {
  album: Album;
  port: string;
  selectAlbum: (album: Album) => void;
  playTracks: (tracks: Track[]) => void;
}

class AlbumViewThumbnail extends PureComponent<AlbumViewThumbnailProps> {
  private cover: HTMLDivElement | null = null;

  componentDidMount() {
    this.updateCover();
  }

  componentDidUpdate(prevProps: AlbumViewThumbnailProps) {
    if (this.props.album.cover !== prevProps.album.cover) {
      this.updateCover();
    }
  }

  updateCover() {
    const { album, port } = this.props;

    if (album.cover && this.cover) {
      const cover = `${basename(album.cover, extname(album.cover))}-optimized.png`;
      this.cover.style.backgroundImage = `url("http://localhost:${port}/albumart/${cover}")`;
    }
  }

  render() {
    const { album, selectAlbum, playTracks } = this.props;
    return (
      <div
        key={album.id}
        className={style.albumViewThumbnail}
        onClick={() => selectAlbum(album)}
        onDoubleClick={() => playTracks(album.tracks)}
        onTouchEnd={() => playTracks(album.tracks)}
      >
        <div
          title={album.title}
          className={style.cover}
          ref={(c) => {
            this.cover = c;
          }}
        >
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
  }
}

export default AlbumViewThumbnail;
