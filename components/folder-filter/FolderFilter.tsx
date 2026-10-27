import { useId, useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import type { Folder } from '../../types/library';
import { selectedFolders } from '../../client/library-query';
import { useTranslation } from '../../client/i18n';
import style from './FolderFilter.scss';

interface FolderFilterProps {
  /** The folders of the library */
  folders: Folder[];
  /** The folders the collection is limited to, none is all of them; it can hold a folder the library no longer has */
  selected: string[];
  setSelected: (folders: string[]) => void;
}

const FolderFilter = ({ folders, selected, setSelected }: FolderFilterProps) => {
  const { t } = useTranslation();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  // what is checked while the list is open: Clear leaves nothing checked, which shows everything just like all checked do
  const [draft, setDraft] = useState<string[]>();
  const paths = folders.map(({ path }) => path);
  const known = selectedFolders(selected, folders);
  const checked = draft ?? (known.length ? known : paths);
  const label = known.length === 0 || known.length === paths.length ? t('folderFilter.all') : t('folderFilter.selected', { count: known.length });

  const close = () => {
    setOpen(false);
    setDraft(undefined);
  };

  // every folder checked is no filter
  const choose = (next: string[]) => {
    setDraft(next);
    setSelected(next.length === paths.length ? [] : next);
  };

  const toggle = (path: string) =>
    choose(checked.includes(path) ? checked.filter((item) => item !== path) : paths.filter((item) => item === path || checked.includes(item)));

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || !open) return;

    event.stopPropagation();
    close();
    event.currentTarget.querySelector('button')?.focus();
  };

  return (
    <div className={style.folderFilter} onBlur={handleBlur} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className={style.toggle}
        aria-label={`${t('folderFilter.label')}: ${label}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {label}
        <FaChevronDown />
      </button>
      {open && (
        <div id={panelId} role="group" className={style.panel} aria-label={t('folderFilter.label')}>
          <div className={style.actions}>
            <button type="button" onClick={() => choose(paths)}>
              {t('folderFilter.selectAll')}
            </button>
            <button type="button" onClick={() => choose([])}>
              {t('folderFilter.clear')}
            </button>
          </div>
          <ul className={style.folders}>
            {paths.map((path) => (
              <li key={path}>
                <label title={path}>
                  <input type="checkbox" checked={checked.includes(path)} onChange={() => toggle(path)} />
                  <span>{path}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FolderFilter;
