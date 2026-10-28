import { useState } from 'react';
import classNames from 'classnames';
import { MdPlayArrow as PlayIcon } from 'react-icons/md';
import type { HistoryItem } from '../../types/favourites';
import type { Track } from '../../types/library';
import type { RadioStation } from '../../types/radio';
import { getCoverUrl } from '../../client/cover-url';
import { getFavouriteTracks } from '../../client/favourite-tracks';
import { isPlayingItem } from '../../client/history';
import { useTranslation } from '../../client/i18n';
import style from './HomeView.scss';
import { toRadioTrack } from '../../client/radio-track';
import AudioFormatBadge from '../audio-format-badge';
import Confirm from '../confirm';
import FavouriteButton from '../favourite-button';
import Time from '../time';

interface HomeViewProps {
  history: HistoryItem[];
  currentSong: Track | null;
  playTracks: (tracks: Track[]) => void;
  playStation: (station: RadioStation) => void;
  clearHistory: () => void;
}

const nameOf = (item: HistoryItem) => (item.kind === 'station' ? item.snapshot.name : item.kind === 'track' ? item.snapshot.title : '');

const HomeView = ({ history, currentSong, playTracks, playStation, clearHistory }: HomeViewProps) => {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);

  const play = (item: HistoryItem) => (item.kind === 'station' ? playStation(item.snapshot) : getFavouriteTracks([item]).then(playTracks).catch(console.error));

  return (
    <div className={style.home}>
      <div className={style.header}>{t('home.title')}</div>
      <div className={style.contents}>
        <div className={style.sectionHeader}>
          <span className={style.sectionTitle}>{t('home.recentlyPlayed')}</span>
          <button disabled={history.length === 0} onClick={() => setConfirming(true)}>
            {t('home.clear')}
          </button>
        </div>
        {history.length === 0 && <div className={style.message}>{t('home.empty')}</div>}
        {history.map((item) => (
          <div
            key={`${item.source}/${item.kind}/${item.id}`}
            className={classNames(style.item, { [style.unavailable]: !item.available, [style.current]: isPlayingItem(item, currentSong) })}
            onDoubleClick={() => item.available && play(item)}
          >
            <div
              className={style.cover}
              style={item.kind === 'track' && item.snapshot.picture ? { backgroundImage: `url("${getCoverUrl(item.snapshot.picture)}")` } : undefined}
            />
            <span className={style.name} title={nameOf(item)}>
              {nameOf(item)}
            </span>
            <AudioFormatBadge
              track={item.kind === 'station' ? toRadioTrack(item.snapshot) : item.kind === 'track' ? item.snapshot : undefined}
              className={style.format}
            />
            {item.kind === 'track' && <span className={style.artist}>{item.snapshot.artist}</span>}
            <span className={style.album}>{!item.available ? t('home.unavailable') : item.kind === 'track' ? item.snapshot.album : t('home.station')}</span>
            <span className={style.duration}>{item.kind === 'track' && item.snapshot.duration ? <Time seconds={item.snapshot.duration} /> : null}</span>
            <FavouriteButton item={item} />
            <button className={style.playButton} disabled={!item.available} aria-label={t('player.play')} onClick={() => play(item)}>
              <PlayIcon size="12px" />
            </button>
          </div>
        ))}
      </div>
      <Confirm
        message={confirming ? t('home.clearConfirm') : null}
        confirm={() => {
          clearHistory();
          setConfirming(false);
        }}
        cancel={() => setConfirming(false)}
      />
    </div>
  );
};

export default HomeView;
