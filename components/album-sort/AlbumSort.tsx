import { albumSortFields, sortDirections } from '../../types/library-query';
import type { AlbumSort as AlbumSortValue, AlbumSortField, SortDirection } from '../../types/library-query';
import { useTranslation } from '../../client/i18n';
import style from './AlbumSort.scss';

interface AlbumSortProps {
  /** The sort of the albums, undefined is the default order */
  sort: AlbumSortValue | undefined;
  setSort: (sort: AlbumSortValue | undefined) => void;
}

const isField = (value: string): value is AlbumSortField => albumSortFields.some((field) => field === value);

const isDirection = (value: string): value is SortDirection => sortDirections.some((direction) => direction === value);

const AlbumSort = ({ sort, setSort }: AlbumSortProps) => {
  const { t } = useTranslation();

  // a field picked while the order is the default starts ascending, the default order has no field to leave
  const pickField = (value: string) => setSort(isField(value) ? { field: value, direction: sort?.direction ?? 'asc' } : undefined);

  const pickDirection = (value: string) => sort && isDirection(value) && setSort({ field: sort.field, direction: value });

  return (
    <div className={style.albumSort}>
      <select className={style.select} aria-label={t('albums.sortField')} value={sort?.field ?? ''} onChange={(event) => pickField(event.target.value)}>
        <option value="">{t('albums.sort.default')}</option>
        {albumSortFields.map((field) => (
          <option key={field} value={field}>
            {t(`albums.sort.${field}`)}
          </option>
        ))}
      </select>
      <select
        className={style.select}
        aria-label={t('albums.sortDirection')}
        value={sort?.direction ?? 'asc'}
        disabled={!sort}
        onChange={(event) => pickDirection(event.target.value)}
      >
        {sortDirections.map((direction) => (
          <option key={direction} value={direction}>
            {t(`albums.sort.${direction}`)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default AlbumSort;
