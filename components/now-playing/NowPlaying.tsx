import classNames from 'classnames';
import slugify from 'slugify';
import { MdPlayArrow as PlayIcon } from 'react-icons/md';
import type { Track } from '../../types/library';
import { toNowPlaying } from '../../client/now-playing';
import type { RadioStation } from '../../types/radio';
import { useTranslation } from '../../client/i18n';
import { trackFavourite } from '../../client/favourites';
import style from './NowPlaying.scss';
import AudioFormatBadge from '../audio-format-badge';
import FavouriteButton from '../favourite-button';

interface NowPlayingProps {
  nowPlaying: Track[];
  currentSong: Track | null;
  streamTitle: string | null;
  streamArt: string | null;
  /** The station that was played last */
  station?: RadioStation;
  playTrack: (track: Track) => void;
}

const NowPlaying = ({ nowPlaying, currentSong, streamTitle, streamArt, station, playTrack }: NowPlayingProps) => {
  const { t } = useTranslation();
  const shown = currentSong ? toNowPlaying(currentSong, streamTitle, streamArt) : undefined;

  return (
    <div className={style.nowPlaying}>
      <div className={style.header}>{t('nowPlaying.title')}</div>
      <div className={style.contents}>
        {currentSong && shown && (
          <div className={style.currentSong}>
            <div className={style.cover} style={shown.cover ? { backgroundImage: `url("${shown.cover}")` } : undefined} />
            <div className={style.meta}>
              <div className={style.title}>
                {shown.track.track ? <span className={style.trackNo}>#{shown.track.track}</span> : ''}
                {shown.track.title}
              </div>
              <div className={style.album}>{shown.track.album}</div>
              <div className={style.artist}>{shown.track.artist}</div>
              <div className={style.format}>
                <AudioFormatBadge track={shown.track} />
              </div>
              <FavouriteButton item={trackFavourite(currentSong, station)} className={style.favourite} />
            </div>
          </div>
        )}
        <div className={style.tracks}>
          {nowPlaying.map((track) => (
            <div
              key={`now-playing-track-${slugify(track.path, { remove: /[*+~./()'",!:@\\]/g, lower: true })}`}
              className={classNames(style.track, {
                [style.current]: currentSong && track.path === currentSong.path,
              })}
              onDoubleClick={() => playTrack(track)}
              title={`#${track.track ? track.track + ' ' : ''}${track.title}`}
            >
              <span className={style.playButton} onClick={() => playTrack(track)}>
                <PlayIcon className={style.playIcon} size={'12px'} />
              </span>
              {track.track ? <span className={style.trackNo}>#{track.track}</span> : ''}
              {track.title}
              <span className={style.format}>
                <AudioFormatBadge track={track} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NowPlaying;
