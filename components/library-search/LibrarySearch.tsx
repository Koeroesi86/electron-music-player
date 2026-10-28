import { useState } from 'react';
import { useTranslation } from '../../client/i18n';
import { useDelayedValue } from '../../client/hooks/use-delayed-value';
import { useUpdateEffect } from '../../client/hooks/use-update-effect';
import style from './LibrarySearch.scss';

interface LibrarySearchProps {
  /** The text the library is searched for now */
  search: string;
  setSearch: (search: string) => void;
}

/** The same delay as the search of the radio stations */
const searchDelay = 400;

const LibrarySearch = ({ search, setSearch }: LibrarySearchProps) => {
  const { t } = useTranslation();
  const [text, setText] = useState(search);
  const delayedText = useDelayedValue(text, searchDelay);

  useUpdateEffect(() => {
    // what the dispatch returns is not a cleanup
    setSearch(delayedText);
  }, [delayedText]);

  return (
    <input
      className={style.librarySearch}
      type="search"
      aria-label={t('library.search')}
      placeholder={t('library.search')}
      value={text}
      onChange={(event) => setText(event.target.value)}
    />
  );
};

export default LibrarySearch;
