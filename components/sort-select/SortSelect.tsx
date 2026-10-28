import { sortDirections } from '../../types/library-query';
import type { Sort, SortDirection } from '../../types/library-query';
import style from './SortSelect.scss';

/** The texts of the selects: the label of each, the default order and the name of every field and direction */
interface SortLabels<F extends string> {
  field: string;
  direction: string;
  default: string;
  fields: Record<F, string>;
  directions: Record<SortDirection, string>;
}

interface SortSelectProps<F extends string> {
  /** The fields to pick from */
  fields: readonly F[];
  labels: SortLabels<F>;
  /** The sort of the list, undefined is the default order */
  sort: Sort<F> | undefined;
  setSort: (sort: Sort<F> | undefined) => void;
}

const isDirection = (value: string): value is SortDirection => sortDirections.some((direction) => direction === value);

/** A field and a direction to sort a list by */
const SortSelect = <F extends string>({ fields, labels, sort, setSort }: SortSelectProps<F>) => {
  // a field picked while the order is the default starts ascending, the default order has no field to leave
  const pickField = (value: string) => {
    const field = fields.find((item) => item === value);
    setSort(field ? { field, direction: sort?.direction ?? 'asc' } : undefined);
  };

  const pickDirection = (value: string) => sort && isDirection(value) && setSort({ field: sort.field, direction: value });

  return (
    <div className={style.sortSelect}>
      <select className={style.select} aria-label={labels.field} value={sort?.field ?? ''} onChange={(event) => pickField(event.target.value)}>
        <option value="">{labels.default}</option>
        {fields.map((field) => (
          <option key={field} value={field}>
            {labels.fields[field]}
          </option>
        ))}
      </select>
      <select
        className={style.select}
        aria-label={labels.direction}
        value={sort?.direction ?? 'asc'}
        disabled={!sort}
        onChange={(event) => pickDirection(event.target.value)}
      >
        {sortDirections.map((direction) => (
          <option key={direction} value={direction}>
            {labels.directions[direction]}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SortSelect;
