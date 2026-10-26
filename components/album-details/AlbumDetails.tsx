import classNames from 'classnames';
import { faPlay, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { Album, Track } from '../../types/library';
import { useTranslation } from '../../client/i18n';
import { useDelayedValue } from '../../client/hooks/use-delayed-value';
import style from './AlbumDetails.scss';
import Time from '../time';

interface AlbumDetailsProps {
  album: Album | null;
  port: string;
  playTracks: (tracks: Track[]) => void;
  close: () => void;
}

const AlbumDetails = ({ album, playTracks, close, port }: AlbumDetailsProps) => {
  const { t } = useTranslation();
  const displayed: Partial<Album> = { ...useDelayedValue(album, 2) };

  return (
    <div className={classNames(style.albumDetails, { [style.hasAlbum]: album })}>
      <div className={style.close} onClick={close}>
        <FontAwesomeIcon icon={faTimes} size="lg" />
      </div>
      <div
        className={style.cover}
        style={{ backgroundImage: displayed.cover ? `url("http://127.0.0.1:${port}/local?path=${encodeURIComponent(displayed.cover)}")` : '' }}
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
        {displayed.tracks?.map((track) => (
          <div key={track.path} className={style.track}>
            {track.track && track.track + ' - '}
            {track.title}
          </div>
        ))}
      </div>
      <div className={style.playAlbum} onClick={() => playTracks(displayed.tracks ?? [])}>
        <FontAwesomeIcon icon={faPlay} size="sm" />
        <span className={style.label}>{t('album.play')}</span>
      </div>
    </div>
  );
};

export default AlbumDetails;
