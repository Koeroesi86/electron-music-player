import { useEffect, useRef } from 'react';
import classNames from 'classnames';
import slugify from 'slugify';
import { MdMusicNote as NoteIcon, MdPlayArrow as PlayIcon } from 'react-icons/md';
import type { Track } from '../../types/library';
import { toNowPlaying } from '../../client/now-playing';
import type { RadioStation } from '../../types/radio';
import { useTranslation } from '../../client/i18n';
import { trackFavourite } from '../../client/favourites';
import style from './NowPlaying.scss';
import AudioFormatBadge from '../audio-format-badge';
import FavouriteButton from '../favourite-button';
import Time from '../time';

interface NowPlayingProps {
  nowPlaying: Track[];
  currentSong: Track | null;
  streamTitle: string | null;
  streamArt: string | null;
  isPlaying: boolean;
  /** The station that was played last */
  station?: RadioStation;
  playTrack: (track: Track) => void;
  openLibrary: () => void;
}

const NowPlaying = ({ nowPlaying, currentSong, streamTitle, streamArt, isPlaying, station, playTrack, openLibrary }: NowPlayingProps) => {
  const { t } = useTranslation();
  const shown = currentSong ? toNowPlaying(currentSong, streamTitle, streamArt) : undefined;
  const list = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLDivElement>(null);

  // the list opens, and follows the song, with the current track in the middle
  useEffect(() => {
    if (!list.current || !current.current) return;
    list.current.scrollTop = current.current.offsetTop - (list.current.clientHeight - current.current.offsetHeight) / 2;
  }, [currentSong?.path]);

  if (!currentSong && nowPlaying.length === 0) {
    return (
      <div className={style.nowPlaying}>
        <div className={style.empty}>
          <NoteIcon className={style.emptyIcon} size="36px" />
          <div className={style.emptyTitle}>{t('nowPlaying.nothing')}</div>
          <div>{t('nowPlaying.nothingHint')}</div>
          <button type="button" className={style.emptyButton} onClick={openLibrary}>
            {t('nowPlaying.openLibrary')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={style.nowPlaying}>
      <div className={style.contents}>
        {currentSong && shown && (
          <div className={style.currentSong}>
            <div className={style.cover} style={shown.cover ? { backgroundImage: `url("${shown.cover}")` } : undefined} />
            <div className={style.meta}>
              <div className={style.title}>{shown.track.title}</div>
              <div className={style.artist}>{shown.track.artist}</div>
              <div className={style.album}>{[shown.track.album, shown.track.year || undefined].filter(Boolean).join(' · ')}</div>
              <div className={style.actions}>
                <AudioFormatBadge track={shown.track} />
                <FavouriteButton item={trackFavourite(currentSong, station)} className={style.favourite} />
              </div>
            </div>
          </div>
        )}
        <div className={style.queue}>
          <div className={style.queueHeader}>
            <span>
              {t('nowPlaying.upNext')} · {t('tracks.count', { count: nowPlaying.length })}
            </span>
            <Time seconds={nowPlaying.reduce((total, track) => total + (track.duration || 0), 0)} />
          </div>
          <div className={style.tracks} ref={list}>
            {nowPlaying.map((track, index) => {
              const isCurrent = !!currentSong && track.path === currentSong.path;

              return (
                <div
                  key={`now-playing-track-${slugify(track.path, { remove: /[*+~./()'",!:@\\]/g, lower: true })}`}
                  ref={isCurrent ? current : undefined}
                  className={classNames(style.track, { [style.current]: isCurrent })}
                  onDoubleClick={() => playTrack(track)}
                  title={`#${track.track ? track.track + ' ' : ''}${track.title}`}
                >
                  <span className={style.number}>
                    <span className={style.numberText}>
                      {isCurrent ? (
                        <span className={classNames(style.meter, { [style.paused]: !isPlaying })} aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </span>
                      ) : (
                        track.track || index + 1
                      )}
                    </span>
                    <button
                      type="button"
                      className={style.playButton}
                      aria-label={t('nowPlaying.play', { title: track.title })}
                      onClick={() => playTrack(track)}
                    >
                      <PlayIcon size="16px" />
                    </button>
                  </span>
                  <span className={style.name}>{track.title}</span>
                  <span className={style.format}>
                    <AudioFormatBadge track={track} />
                  </span>
                  <span className={style.duration}>{track.duration ? <Time seconds={track.duration} /> : null}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NowPlaying;
