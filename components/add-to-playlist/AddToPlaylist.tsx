import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { MdPlaylistAdd as AddIcon } from 'react-icons/md';
import type { Playlist } from '../../types/playlists';
import type { PlaylistSource } from '../../client/playlists';
import { useTranslation } from '../../client/i18n';
import style from './AddToPlaylist.scss';

interface AddToPlaylistProps {
  /** The track or album the menu adds */
  source: PlaylistSource;
  playlists: Playlist[];
  add: (id: number, source: PlaylistSource) => void;
  create: (name: string, source: PlaylistSource) => void;
  className?: string;
}

const menuWidth = 220;

/** The button of a track or album that opens a menu of the playlists, with a field to start a new one */
const AddToPlaylist = ({ source, playlists, add, create, className }: AddToPlaylistProps) => {
  const { t } = useTranslation();
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | undefined>(undefined);
  const [name, setName] = useState('');
  const close = () => {
    setPosition(undefined);
    setName('');
  };

  useEffect(() => {
    if (!position) return undefined;

    const closeOutside = (event: Event) => {
      if (event.target instanceof Node && (menu.current?.contains(event.target) || button.current?.contains(event.target))) return;
      close();
    };
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && close();
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    // the menu is placed once, so it does not follow a list that scrolls under it
    window.addEventListener('blur', close);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('blur', close);
    };
  }, [position]);

  const open = () => {
    const rect = button.current?.getBoundingClientRect();
    if (!rect) return;

    setPosition({ top: rect.bottom + 4, left: Math.max(4, Math.min(rect.left, window.innerWidth - menuWidth - 4)) });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    create(name.trim(), source);
    close();
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        className={classNames(style.addToPlaylist, className)}
        title={t('playlists.add')}
        aria-label={t('playlists.add')}
        aria-haspopup="menu"
        aria-expanded={position !== undefined}
        // the button sits in rows that select and play on click
        onClick={(event) => {
          event.stopPropagation();
          if (position) close();
          else open();
        }}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <AddIcon size="16px" />
      </button>
      {position &&
        createPortal(
          // a portal still passes events up the React tree, to the row that holds the button
          <div
            ref={menu}
            role="menu"
            className={style.menu}
            style={{ ...position, width: menuWidth }}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            <div className={style.title}>{t('playlists.addTo')}</div>
            {playlists.map(({ id, name: playlistName }) => (
              <button
                key={id}
                type="button"
                role="menuitem"
                className={style.item}
                onClick={() => {
                  add(id, source);
                  close();
                }}
              >
                {playlistName}
              </button>
            ))}
            <form className={style.create} onSubmit={submit}>
              <input
                value={name}
                placeholder={t('playlists.newName')}
                aria-label={t('playlists.newName')}
                maxLength={200}
                onChange={(event) => setName(event.target.value)}
              />
              <button type="submit" disabled={!name.trim()}>
                {t('playlists.create')}
              </button>
            </form>
          </div>,
          document.body
        )}
    </>
  );
};

export default AddToPlaylist;
