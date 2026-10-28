import { useEffect, useState } from 'react';
import classNames from 'classnames';
import { MdPlayArrow as PlayIcon } from 'react-icons/md';
import type { RadioOption, RadioQuery, RadioStation } from '../../types/radio';
import { countRadioFilters, parseRadioQuery, radioBitrates, radioPageSize, radioSortFields } from '../../types/radio-query';
import type { RadioState } from '../../client/redux/radio/reducer';
import { useTranslation } from '../../client/i18n';
import { useDelayedValue } from '../../client/hooks/use-delayed-value';
import { useUpdateEffect } from '../../client/hooks/use-update-effect';
import { stationFavourite } from '../../client/favourites';
import type { Translator } from '../../locales/translate';
import { toRadioTrack } from '../../client/radio-track';
import AudioFormatBadge from '../audio-format-badge';
import FavouriteButton from '../favourite-button';
import style from './RadioStations.scss';

interface RadioStationsProps {
  radio: RadioState;
  currentStation?: string;
  search: (query: RadioQuery) => void;
  loadTags: () => void;
  loadOptions: () => void;
  play: (station: RadioStation) => void;
}

const searchDelay = 400;

// the codec and the bitrate are in the badge; a bitrate of 0 is one the directory does not know
const describe = ({ country, bitrate }: RadioStation, { t }: Translator) => [country, bitrate ? '' : t('radio.bitrateUnknown')].filter(Boolean).join(' · ');

interface FilterSelectProps {
  label: string;
  allLabel: string;
  value: string | undefined;
  options: RadioOption[];
  onChange: (value: string | undefined) => void;
  formatNumber: Translator['formatNumber'];
}

/** A value that was saved but is not among the loaded ones (the list failed to load) stays selectable as it is */
const FilterSelect = ({ label, allLabel, value, options, onChange, formatNumber }: FilterSelectProps) => (
  <select className={style.select} aria-label={label} value={value ?? ''} onChange={(event) => onChange(event.target.value || undefined)}>
    <option value="">{allLabel}</option>
    {value && !options.some((option) => option.value === value) && <option value={value}>{value}</option>}
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.name} ({formatNumber(option.stationCount)})
      </option>
    ))}
  </select>
);

const RadioStations = ({ radio, currentStation, search, loadTags, loadOptions, play }: RadioStationsProps) => {
  const translator = useTranslation();
  const { t, formatNumber } = translator;
  const { query, offset, hasMore, stations, tags, countries, languages, codecs, loading, error } = radio;
  const filterCount = countRadioFilters(query);
  const change = (changes: RadioQuery) => search({ ...query, ...changes });
  const [name, setName] = useState(query.name ?? '');
  const delayedName = useDelayedValue(name, searchDelay);

  useEffect(() => {
    loadTags();
    loadOptions();
    search(query);
    // the list as it was left, the genres and the values to filter by load when the panel is first shown
  }, []);

  useUpdateEffect(() => {
    // a search that already has this name (the filters were cleared) is not run again
    if ((delayedName.trim() || undefined) !== query.name) change({ name: delayedName.trim() || undefined });
  }, [delayedName]);

  const clearFilters = () => {
    setName('');
    search({ sort: query.sort, descending: query.descending });
  };

  return (
    <div className={style.radioStations}>
      <div className={style.controls}>
        <input className={style.search} type="search" placeholder={t('radio.search')} value={name} onChange={(event) => setName(event.target.value)} />
        <select
          className={style.select}
          aria-label={t('radio.genre')}
          value={query.tag ?? ''}
          onChange={(event) => change({ tag: event.target.value || undefined })}
        >
          <option value="">{t('radio.allGenres')}</option>
          {tags.map((tag) => (
            <option key={tag.name} value={tag.name}>
              {tag.name} ({formatNumber(tag.stationCount)})
            </option>
          ))}
        </select>
      </div>
      <div className={style.controls} role="group" aria-label={t('radio.filters')}>
        <FilterSelect
          label={t('radio.country')}
          allLabel={t('radio.allCountries')}
          value={query.country}
          options={countries}
          onChange={(country) => change({ country })}
          formatNumber={formatNumber}
        />
        <FilterSelect
          label={t('radio.language')}
          allLabel={t('radio.allLanguages')}
          value={query.language}
          options={languages}
          onChange={(language) => change({ language })}
          formatNumber={formatNumber}
        />
        <FilterSelect
          label={t('radio.codec')}
          allLabel={t('radio.allCodecs')}
          value={query.codec}
          options={codecs}
          onChange={(codec) => change({ codec })}
          formatNumber={formatNumber}
        />
        <select
          className={style.select}
          aria-label={t('radio.minimumBitrate')}
          value={query.bitrateMin ?? ''}
          onChange={(event) => change({ bitrateMin: radioBitrates.find((bitrate) => `${bitrate}` === event.target.value) })}
        >
          <option value="">{t('radio.anyBitrate')}</option>
          {radioBitrates.map((bitrate) => (
            <option key={bitrate} value={bitrate}>
              {t('radio.bitrateMinimum', { bitrate })}
            </option>
          ))}
        </select>
        <button className={style.clear} type="button" disabled={filterCount === 0} onClick={clearFilters}>
          {filterCount > 0 ? t('radio.clearFiltersCount', { count: filterCount }) : t('radio.clearFilters')}
        </button>
      </div>
      <div className={style.controls} role="group" aria-label={t('radio.sorting')}>
        <select
          className={style.select}
          aria-label={t('radio.sortBy')}
          value={query.sort ?? 'popularity'}
          onChange={(event) => change({ sort: parseRadioQuery({ sort: event.target.value }).sort })}
        >
          {radioSortFields.map((field) => (
            <option key={field} value={field}>
              {t(`radio.sort.${field}`)}
            </option>
          ))}
        </select>
        <select
          className={style.select}
          aria-label={t('radio.direction')}
          value={query.descending === false ? 'asc' : 'desc'}
          onChange={(event) => change({ descending: event.target.value === 'asc' ? false : undefined })}
        >
          <option value="desc">{t('radio.descending')}</option>
          <option value="asc">{t('radio.ascending')}</option>
        </select>
      </div>
      <div className={style.stations}>
        {error && <div className={style.message}>{t('radio.error', { error })}</div>}
        {loading && <div className={style.message}>{t('radio.loading')}</div>}
        {!loading && !error && stations.length === 0 && <div className={style.message}>{t('radio.empty')}</div>}
        {stations.map((station) => (
          <div
            key={station.uuid}
            className={classNames(style.station, { [style.current]: station.uuid === currentStation })}
            onDoubleClick={() => play(station)}
            title={station.tags.join(', ')}
          >
            <span className={style.playButton} onClick={() => play(station)}>
              <PlayIcon size={'12px'} />
            </span>
            <span className={style.name}>{station.name}</span>
            <AudioFormatBadge track={toRadioTrack(station)} className={style.format} />
            <span className={style.details}>{describe(station, translator)}</span>
            <FavouriteButton item={stationFavourite(station)} className={style.favourite} />
          </div>
        ))}
        {hasMore && !loading && (
          <button className={style.loadMore} type="button" onClick={() => search({ ...query, offset: offset + radioPageSize })}>
            {t('radio.loadMore')}
          </button>
        )}
      </div>
    </div>
  );
};

export default RadioStations;
