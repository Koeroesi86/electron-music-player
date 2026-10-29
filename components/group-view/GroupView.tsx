import { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import { FaCaretDown, FaCaretUp, FaChevronLeft } from 'react-icons/fa';
import type { Folder, GroupSummary } from '../../types/library';
import { cycleSort } from '../../types/library-query';
import type { GroupKind, GroupSort, GroupSortField } from '../../types/library-query';
import { useTranslation } from '../../client/i18n';
import { useDelayedValue } from '../../client/hooks/use-delayed-value';
import { usePageLoader } from '../../client/hooks/use-page-loader';
import { useScrollSeparator } from '../../client/hooks/use-scroll-separator';
import { useUpdateEffect } from '../../client/hooks/use-update-effect';
import { useWindowedList } from '../../client/hooks/use-windowed-list';
import { selectedFolders } from '../../client/library-query';
import { getCachedItem } from '../../client/redux/library/pages';
import type { PageCache } from '../../client/redux/library/pages';
import type { OpenGroup } from '../../client/redux/types';
import AlbumSort from '../album-sort';
import GroupAlbums from '../group-albums';
import GroupSortSelect from '../group-sort';
import GroupTile from '../group-tile';
import style from './GroupView.scss';

/** The height of a row of the list in px, matching .group in GroupView.scss */
const listRowHeight = 40;

/** The size of a tile with its margin in px, matching .groupTile in GroupTile.scss */
const tileWidth = 112;
const tileRowHeight = 160;

/** The artists and the album artists are tiles like the albums, the genres have no covers of their own and stay a list */
const tiledKinds: GroupKind[] = ['artist', 'albumArtist'];

/** How long the filter waits for the next key before the list is asked again */
const filterDelay = 250;

const ariaSorts = { asc: 'ascending', desc: 'descending' } as const;

interface GroupViewProps {
  kind: GroupKind;
  groups: PageCache<GroupSummary>;
  /** The sort and the filter of the list, undefined is the default order and an empty text is all of the names */
  sort: GroupSort | undefined;
  filter: string;
  /** The selected folders and the folders of the library, the selection can hold a folder the library no longer has */
  selected: string[];
  folders: Folder[];
  /** The group whose albums are shown instead of the list */
  open: OpenGroup | undefined;
  loadPage: (page: number) => void;
  setSort: (sort: GroupSort | undefined) => void;
  setFilter: (filter: string) => void;
  openGroup: (group: OpenGroup) => void;
  closeGroup: () => void;
}

interface HeaderFieldProps {
  field: GroupSortField;
  className: string;
  label: string;
  sort: GroupSort | undefined;
  onSort: (field: GroupSortField) => void;
}

/** A column header that sorts by its column when it is clicked, and shows the direction while it is the sorted column */
const HeaderField = ({ field, className, label, sort, onSort }: HeaderFieldProps) => {
  const active = sort?.field === field ? sort : undefined;

  return (
    <div role="columnheader" aria-sort={active ? ariaSorts[active.direction] : 'none'} className={classNames(style.field, className)}>
      <button type="button" onClick={() => onSort(field)}>
        {label}
        {active?.direction === 'asc' && <FaCaretUp aria-hidden />}
        {active?.direction === 'desc' && <FaCaretDown aria-hidden />}
      </button>
    </div>
  );
};

/** The list of the groups; it is its own component as its scroll and size listeners belong to the element, which is new each time the list comes back */
const GroupList = ({ kind, groups, sort, filter, selected, folders, loadPage, setSort, setFilter, openGroup }: Omit<GroupViewProps, 'open' | 'closeGroup'>) => {
  const { t } = useTranslation();
  const { separator, listing: scrolled } = useScrollSeparator(style.scrolled);
  const tiled = tiledKinds.includes(kind);
  const { listing, columns, firstIndex, lastIndex, offsetTop, height } = useWindowedList({
    itemCount: groups.total ?? 0,
    rowHeight: tiled ? tileRowHeight : listRowHeight,
    itemWidth: tiled ? tileWidth : undefined,
  });
  usePageLoader(groups, firstIndex, lastIndex, loadPage);

  // the text is shown as it is typed, the list is asked for it once the typing pauses
  const [text, setText] = useState(filter);
  const typed = useDelayedValue(text, filterDelay);
  useUpdateEffect(() => {
    setFilter(typed);
  }, [typed, setFilter]);

  const queryKey = JSON.stringify([sort, filter, selectedFolders(selected, folders)]);
  // another sort, filter or other folders are another list, which starts from its top
  useEffect(() => {
    if (listing.current) listing.current.scrollTop = 0;
  }, [listing, queryKey]);

  const setListing = useCallback(
    (element: HTMLDivElement | null) => {
      listing.current = element;
      scrolled.current = element;
    },
    [listing, scrolled]
  );

  const sortBy = (field: GroupSortField) => setSort(cycleSort(sort, field));
  const nameOf = (name: string) => name || t(`groups.unknown.${kind}`);
  const openOne = (group: GroupSummary) => openGroup({ kind, key: group.key, name: group.name });
  const rows = Array.from({ length: Math.ceil((lastIndex - firstIndex) / columns) }, (_, row) =>
    Array.from({ length: Math.min(columns, lastIndex - firstIndex - row * columns) }, (__, column) => firstIndex + row * columns + column)
  );

  const tiles = rows.map((indexes) => (
    <div key={indexes[0]} className={style.tileRow}>
      {indexes.map((index) => {
        const group = getCachedItem(groups, index);
        return group ? (
          <GroupTile key={group.key} group={group} unknownName={nameOf('')} open={openOne} />
        ) : (
          <div key={index} className={style.tilePlaceholder} />
        );
      })}
    </div>
  ));

  const list = Array.from({ length: lastIndex - firstIndex }, (_, offset) => {
    const group = getCachedItem(groups, firstIndex + offset);
    return group ? (
      <button key={group.key} type="button" className={style.group} onClick={() => openOne(group)}>
        <span className={classNames(style.field, style.name, { [style.unknown]: !group.name })} title={nameOf(group.name)}>
          {nameOf(group.name)}
        </span>
        <span className={classNames(style.field, style.count)}>{group.albumCount}</span>
        <span className={classNames(style.field, style.count)}>{group.trackCount}</span>
      </button>
    ) : (
      <div key={firstIndex + offset} className={style.placeholder} />
    );
  });

  return (
    <div className={classNames(style.groups, { [style.tiled]: tiled })}>
      <div className={style.toolbar}>
        <input
          type="search"
          className={style.filter}
          value={text}
          placeholder={t('groups.filter')}
          aria-label={t('groups.filter')}
          onChange={(event) => setText(event.target.value)}
        />
        {tiled && <GroupSortSelect />}
      </div>
      {!tiled && (
        <div role="row" className={style.header}>
          <HeaderField field="name" className={style.name} label={t('groups.name')} sort={sort} onSort={sortBy} />
          <HeaderField field="albumCount" className={style.count} label={t('groups.albums')} sort={sort} onSort={sortBy} />
          <HeaderField field="trackCount" className={style.count} label={t('groups.tracks')} sort={sort} onSort={sortBy} />
        </div>
      )}
      <div ref={separator} className={style.separator} />
      <div className={style.listing} ref={setListing}>
        <div className={style.window} style={{ height, paddingTop: offsetTop }}>
          {tiled ? tiles : list}
        </div>
      </div>
      <div className={style.footer}>{t(`groups.count.${kind}`, { count: groups.total ?? 0 })}</div>
    </div>
  );
};

const GroupView = ({ open, closeGroup, ...list }: GroupViewProps) => {
  const { t } = useTranslation();
  const openName = open && (open.name || t(`groups.unknown.${open.kind}`));

  return open ? (
    <GroupAlbums
      toolbar={
        <div className={style.albumsBar}>
          <button type="button" className={style.back} onClick={closeGroup} aria-label={t('groups.back')} title={t('groups.back')}>
            <FaChevronLeft aria-hidden />
          </button>
          <span className={style.openName} title={openName}>
            {openName}
          </span>
          <AlbumSort />
        </div>
      }
    />
  ) : (
    <GroupList {...list} />
  );
};

export default GroupView;
