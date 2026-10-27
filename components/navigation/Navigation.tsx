import { useState } from 'react';
import type { FormEvent } from 'react';
import classNames from 'classnames';
import {
  MdAdd as AddIcon,
  MdPlaylistPlay as PlaylistIcon,
  MdHome as HomeIcon,
  MdEqualizer as EQIcon,
  MdSettings as SettingsIcon,
  MdCloudQueue as OnlineIcon,
  MdFavorite as FavouritesIcon,
  MdMusicNote as NowPlayingIcon,
  MdQueueMusic as LocalLibraryIcon,
} from 'react-icons/md';
import type { Tab } from '../../client/redux/types';
import type { Playlist } from '../../types/playlists';
import { useDragReorder } from '../../client/hooks/use-drag-reorder';
import style from './Navigation.scss';
import { useTranslation } from '../../client/i18n';

interface NavigationProps {
  setTab?: (tab: Tab) => void;
  tab?: Tab;
  playlists?: Playlist[];
  playlistId?: number | null;
  openPlaylist?: (id: number) => void;
  createPlaylist?: (name: string) => void;
  movePlaylist?: (id: number, toIndex: number) => void;
}

function Navigation({
  setTab = () => {},
  tab = 'home',
  playlists = [],
  playlistId = null,
  openPlaylist = () => {},
  createPlaylist = () => {},
  movePlaylist = () => {},
}: NavigationProps) {
  const { t } = useTranslation();
  const [name, setName] = useState<string | undefined>(undefined);
  const { itemProps, overIndex } = useDragReorder(movePlaylist);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name?.trim()) createPlaylist(name.trim());
    setName(undefined);
  };

  return (
    <div className={style.navigation}>
      <div
        onClick={() => setTab('home')}
        className={classNames(style.item, {
          [style.active]: tab === 'home',
        })}
      >
        <HomeIcon size={'12px'} />
        <span className={style.label}>{t('nav.home')}</span>
      </div>
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
      <div className={style.group}>{t('nav.playlists')}</div>
      <div
        onClick={() => setTab('favourites')}
        className={classNames(style.item, {
          [style.active]: tab === 'favourites',
        })}
      >
        <FavouritesIcon size={'12px'} />
        <span className={style.label}>{t('nav.liked')}</span>
      </div>
      {playlists.map(({ id, name: playlistName }, index) => (
        <div
          key={id}
          title={playlistName}
          onClick={() => openPlaylist(id)}
          className={classNames(style.item, {
            [style.active]: tab === 'playlist' && playlistId === id,
            [style.dropTarget]: overIndex === index,
          })}
          {...itemProps(id, index)}
        >
          <PlaylistIcon size={'12px'} />
          <span className={style.label}>{playlistName}</span>
        </div>
      ))}
      {name === undefined ? (
        <div onClick={() => setName('')} className={style.item}>
          <AddIcon size={'12px'} />
          <span className={style.label}>{t('nav.newPlaylist')}</span>
        </div>
      ) : (
        <form className={style.newPlaylist} onSubmit={submit}>
          <input
            autoFocus
            value={name}
            maxLength={200}
            placeholder={t('playlists.newName')}
            aria-label={t('playlists.newName')}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Escape' && setName(undefined)}
            onBlur={() => setName(undefined)}
          />
        </form>
      )}
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
