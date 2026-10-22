import classNames from 'classnames';
import type { Tab } from '../../client/redux/types';
import LocalCollection from '../local-collection';
import NowPlaying from '../now-playing';
import OnlineSources from '../online-sources';
import Equalizer from '../equalizer';
import FolderManagement from '../folder-management';
import LauncherIntegration from '../launcher-integration';
import style from './PlayerTabs.scss';

interface PlayerTabsProps {
  tab?: Tab;
  addFiles?: (files: FileList) => void;
}

function PlayerTabs({ tab = 'local', addFiles = () => {} }: PlayerTabsProps) {
  return (
    <div className={style.collection}>
      <div
        className={classNames(style.tab, {
          [style.active]: tab === 'local',
        })}
      >
        <LocalCollection addFiles={addFiles} />
      </div>
      <div
        className={classNames(style.tab, {
          [style.active]: tab === 'now-playing',
        })}
      >
        <NowPlaying />
      </div>
      <div
        className={classNames(style.tab, {
          [style.active]: tab === 'online-sources',
        })}
      >
        <OnlineSources />
      </div>
      <div
        className={classNames(style.tab, {
          [style.active]: tab === 'equalizer',
        })}
      >
        <Equalizer />
      </div>
      <div
        className={classNames(style.tab, {
          [style.active]: tab === 'settings',
        })}
      >
        <FolderManagement addFiles={addFiles} />
        <LauncherIntegration />
      </div>
    </div>
  );
}

export default PlayerTabs;
