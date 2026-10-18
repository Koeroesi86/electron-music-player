import classNames from 'classnames';
import {
  MdEqualizer as EQIcon,
  MdSettings as SettingsIcon,
  MdCloudQueue as ShoutCastIcon,
  MdMusicNote as NowPlayingIcon,
  MdQueueMusic as LocalLibraryIcon,
} from 'react-icons/md';
import type { Tab } from '../../client/redux/types';
import style from './Navigation.scss';

interface NavigationProps {
  setTab?: (tab: Tab) => void;
  tab?: Tab;
}

function Navigation({ setTab = () => {}, tab = 'local' }: NavigationProps) {
  return (
    <div className={style.navigation}>
      <div
        onClick={() => setTab('now-playing')}
        className={classNames(style.item, {
          [style.active]: tab === 'now-playing',
        })}
      >
        <NowPlayingIcon size={'12px'} />
        <span className={style.label}>Now playing</span>
      </div>
      <div
        onClick={() => setTab('local')}
        className={classNames(style.item, {
          [style.active]: tab === 'local',
        })}
      >
        <LocalLibraryIcon size={'12px'} />
        <span className={style.label}>Local collection</span>
      </div>
      <div
        onClick={() => setTab('online-sources')}
        className={classNames(style.item, {
          [style.active]: tab === 'online-sources',
        })}
      >
        <ShoutCastIcon size={'12px'} />
        <span className={style.label}>Online</span>
      </div>
      <div
        onClick={() => setTab('equalizer')}
        className={classNames(style.item, {
          [style.active]: tab === 'equalizer',
        })}
      >
        <EQIcon size={'12px'} />
        <span className={style.label}>Equalizer</span>
      </div>
      <div
        onClick={() => setTab('settings')}
        className={classNames(style.item, {
          [style.active]: tab === 'settings',
        })}
      >
        <SettingsIcon size={'12px'} />
        <span className={style.label}>Settings</span>
      </div>
    </div>
  );
}

export default Navigation;
