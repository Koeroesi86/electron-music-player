import classNames from 'classnames';
import { MdPlayArrow as PlayIcon } from 'react-icons/md';
import type { Favourite } from '../../types/favourites';
import type { Track } from '../../types/library';
import type { RadioStation } from '../../types/radio';
import { getFavouriteTracks } from '../../client/favourite-tracks';
import { useTranslation } from '../../client/i18n';
import type { Translator } from '../../locales/translate';
import style from './FavouritesView.scss';
import FavouriteButton from '../favourite-button';

interface FavouritesViewProps {
  favourites: Favourite[];
  playTracks: (tracks: Track[]) => void;
  playStation: (station: RadioStation) => void;
}

const describe = (favourite: Favourite, { t }: Translator) => {
  switch (favourite.kind) {
    case 'track':
      return [favourite.snapshot.artist, favourite.snapshot.album].filter(Boolean).join(' · ');
    case 'album':
      return [favourite.snapshot.artist, t('favourites.album')].filter(Boolean).join(' · ');
    default:
      return [favourite.snapshot.country, ...favourite.snapshot.tags.slice(0, 3)].filter(Boolean).join(' · ');
  }
};

const nameOf = (favourite: Favourite) => {
  switch (favourite.kind) {
    case 'track':
    case 'album':
      return favourite.snapshot.title;
    default:
      return favourite.snapshot.name;
  }
};

interface SectionProps {
  title: string;
  note?: string;
  favourites: Favourite[];
  play: (favourites: Favourite[]) => void;
}

const Section = ({ title, note, favourites, play }: SectionProps) => {
  const translator = useTranslation();
  const { t } = translator;
  const playable = favourites.filter(({ available }) => available);

  return (
    <div className={style.section}>
      <div className={style.sectionHeader}>
        <span className={style.sectionTitle}>{title}</span>
        <button disabled={playable.length === 0} onClick={() => play(playable)}>
          {t('favourites.playAll')}
        </button>
      </div>
      {note && <div className={style.note}>{note}</div>}
      {favourites.length === 0 && <div className={style.message}>{t('favourites.emptySection')}</div>}
      {favourites.map((favourite) => (
        <div
          key={`${favourite.source}/${favourite.kind}/${favourite.id}`}
          className={classNames(style.favourite, { [style.unavailable]: !favourite.available })}
          onDoubleClick={() => favourite.available && play([favourite])}
        >
          <FavouriteButton item={favourite} />
          <span className={style.name} title={nameOf(favourite)}>
            {nameOf(favourite)}
          </span>
          <span className={style.details}>{favourite.available ? describe(favourite, translator) : t('favourites.unavailable')}</span>
          <button className={style.playButton} disabled={!favourite.available} aria-label={t('player.play')} onClick={() => play([favourite])}>
            <PlayIcon size="12px" />
          </button>
        </div>
      ))}
    </div>
  );
};

const FavouritesView = ({ favourites, playTracks, playStation }: FavouritesViewProps) => {
  const { t } = useTranslation();

  // a single station plays as the station of the radio, anything else is a queue of what the favourites play
  const play = ([first, ...others]: Favourite[]) =>
    first.kind === 'station' && others.length === 0
      ? playStation(first.snapshot)
      : getFavouriteTracks([first, ...others])
          .then(playTracks)
          .catch(console.error);

  return (
    <div className={style.favourites}>
      <div className={style.header}>{t('favourites.title')}</div>
      <div className={style.contents}>
        {favourites.length === 0 && <div className={style.message}>{t('favourites.empty')}</div>}
        <Section title={t('favourites.local')} note={t('favourites.moveNote')} favourites={favourites.filter(({ source }) => source === 'local')} play={play} />
        <Section title={t('favourites.online')} favourites={favourites.filter(({ source }) => source !== 'local')} play={play} />
      </div>
    </div>
  );
};

export default FavouritesView;
