import { PureComponent } from 'react';
import classNames from 'classnames';
import { faPlay, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { Album, Track } from '../../types/library';
import style from './AlbumDetails.scss';
import Time from '../time';

interface AlbumDetailsProps {
  album: Album | null;
  port: string;
  playTracks: (tracks: Track[]) => void;
  close: () => void;
}

interface AlbumDetailsState {
  album: Album | null;
}

class AlbumDetails extends PureComponent<AlbumDetailsProps, AlbumDetailsState> {
  private debounced: ReturnType<typeof setTimeout> | undefined;

  constructor(props: AlbumDetailsProps) {
    super(props);

    this.state = {
      album: props.album,
    };
  }

  componentDidUpdate(prevProps: AlbumDetailsProps) {
    if (this.props.album !== prevProps.album) {
      this.updateDisplayed();
    }
  }

  updateDisplayed() {
    clearTimeout(this.debounced);
    this.debounced = setTimeout(() => {
      this.setState({ album: this.props.album });
    }, 2);
  }

  render() {
    const { playTracks, close, port } = this.props;
    const { album } = this.state;
    const displayed: Partial<Album> = Object.assign({}, album);
    return (
      <div
        className={classNames(style.albumDetails, {
          [style.hasAlbum]: this.props.album,
        })}
      >
        <div className={style.close} onClick={close}>
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </div>
        <div
          className={style.cover}
          style={{ backgroundImage: displayed.cover ? `url("http://localhost:${port}/local?path=${encodeURIComponent(displayed.cover)}")` : '' }}
        />
        <div className={style.artist}>{displayed.artist}</div>
        <div className={style.title}>{displayed.title}</div>
        <div className={style.meta}>
          <div className={style.year}>{displayed.year}</div>
          <div className={style.duration}>
            <Time seconds={displayed.duration} />
          </div>
        </div>
        <div className={style.tracks}>
          {displayed.tracks &&
            displayed.tracks.map((track) => (
              <div key={track.path} className={style.track}>
                {track.track && track.track + ' - '}
                {track.title}
              </div>
            ))}
        </div>
        <div className={style.playAlbum} onClick={() => playTracks(displayed.tracks ?? [])}>
          <FontAwesomeIcon icon={faPlay} size="sm" />
          <span className={style.label}>Play album</span>
        </div>
      </div>
    );
  }
}

export default AlbumDetails;
