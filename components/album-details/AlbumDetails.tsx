import { useState } from 'react';
import classNames from 'classnames';
import { faPlay, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { Album, Track } from '../../types/library';
import { useTranslation } from '../../client/i18n';
import { useLastDefined } from '../../client/hooks/use-last-defined';
import { getCoverUrl } from '../../client/cover-url';
import { getImageTint } from '../../client/cover-tint';
import { albumFavourite } from '../../client/favourites';
import style from './AlbumDetails.scss';
import FavouriteButton from '../favourite-button';
import Time from '../time';

interface AlbumDetailsProps {
  album: Album | null;
  port: string;
  playTracks: (tracks: Track[]) => void;
  close: () => void;
}

const AlbumDetails = ({ album, playTracks, close, port }: AlbumDetailsProps) => {
  const { t } = useTranslation();
  const shown = useLastDefined(album);
  const displayed: Partial<Album> = { ...shown };
  const [failedCover, setFailedCover] = useState<string | undefined>(undefined);
  const [tint, setTint] = useState<{ url: string; color: string } | undefined>(undefined);
  const coverUrl = displayed.cover ? getCoverUrl(port, displayed.cover) : undefined;
  const headerColor = tint?.url === coverUrl ? tint?.color : undefined;
  const readTint = (image: HTMLImageElement) => {
    const color = getImageTint(image);
    setTint(coverUrl && color ? { url: coverUrl, color } : undefined);
  };

  return (
    <div className={classNames(style.albumDetails, { [style.hasAlbum]: album })}>
      <div className={style.header} style={headerColor ? { background: `linear-gradient(135deg, ${headerColor}, #333333)` } : undefined}>
        <button type="button" className={style.close} aria-label={t('album.close')} onClick={close}>
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>
        <div className={style.cover}>
          {coverUrl && coverUrl !== failedCover && (
            <img
              src={coverUrl}
              alt={t('album.cover')}
              crossOrigin="anonymous"
              onError={() => setFailedCover(coverUrl)}
              onLoad={(event) => readTint(event.currentTarget)}
            />
          )}
        </div>
        <div className={style.info}>
          <div className={style.artist}>{displayed.artist}</div>
          <div className={style.title}>{displayed.title}</div>
          {shown && <FavouriteButton item={albumFavourite(shown)} className={style.favourite} />}
          <div className={style.meta}>
            {displayed.year && <span>{displayed.year}</span>}
            <Time seconds={displayed.duration} />
          </div>
          <button type="button" className={style.playAlbum} onClick={() => playTracks(displayed.tracks ?? [])}>
            <FontAwesomeIcon icon={faPlay} size="sm" />
            <span className={style.label}>{t('album.play')}</span>
          </button>
        </div>
      </div>
      <div className={style.tracks}>
        {displayed.tracks?.map((track) => (
          <div key={track.path} className={style.track}>
            <span className={style.number}>{track.track}</span>
            <span className={style.trackTitle}>{track.title}</span>
            {track.duration ? <Time seconds={track.duration} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlbumDetails;
