import classNames from 'classnames';
import {
  MdEqualizer as EQIcon,
  MdSettings as SettingsIcon,
  MdCloudQueue as OnlineIcon,
  MdFavorite as FavouritesIcon,
  MdMusicNote as NowPlayingIcon,
  MdQueueMusic as LocalLibraryIcon,
} from 'react-icons/md';
import type { Tab } from '../../client/redux/types';
import style from './Navigation.scss';
import { useTranslation } from '../../client/i18n';

interface NavigationProps {
  setTab?: (tab: Tab) => void;
  tab?: Tab;
}

function Navigation({ setTab = () => {}, tab = 'local' }: NavigationProps) {
  const { t } = useTranslation();

  return (
    <div className={style.navigation}>
      <div
        onClick={() => setTab('now-playing')}
        className={classNames(style.item, {
          [style.active]: tab === 'now-playing',
        })}
      >
        <NowPlayingIcon size={'12px'} />
        <span className={style.label}>{t('nav.nowPlaying')}</span>
      </div>
      <div
        onClick={() => setTab('local')}
        className={classNames(style.item, {
          [style.active]: tab === 'local',
        })}
      >
        <LocalLibraryIcon size={'12px'} />
        <span className={style.label}>{t('nav.local')}</span>
      </div>
      <div
        onClick={() => setTab('online-sources')}
        className={classNames(style.item, {
          [style.active]: tab === 'online-sources',
        })}
      >
        <OnlineIcon size={'12px'} />
        <span className={style.label}>{t('nav.online')}</span>
      </div>
      <div
        onClick={() => setTab('favourites')}
        className={classNames(style.item, {
          [style.active]: tab === 'favourites',
        })}
      >
        <FavouritesIcon size={'12px'} />
        <span className={style.label}>{t('nav.favourites')}</span>
      </div>
      <div
        onClick={() => setTab('equalizer')}
        className={classNames(style.item, {
          [style.active]: tab === 'equalizer',
        })}
      >
        <EQIcon size={'12px'} />
        <span className={style.label}>{t('nav.equalizer')}</span>
      </div>
      <div
        onClick={() => setTab('settings')}
        className={classNames(style.item, {
          [style.active]: tab === 'settings',
        })}
      >
        <SettingsIcon size={'12px'} />
        <span className={style.label}>{t('nav.settings')}</span>
      </div>
    </div>
  );
}

export default Navigation;
