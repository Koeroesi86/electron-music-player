import { useEffect, useState } from 'react';
import classNames from 'classnames';
import { MdPlayArrow as PlayIcon } from 'react-icons/md';
import type { RadioQuery, RadioStation } from '../../types/radio';
import type { RadioState } from '../../client/redux/radio/reducer';
import { useTranslation } from '../../client/i18n';
import { useDelayedValue } from '../../client/hooks/use-delayed-value';
import { useUpdateEffect } from '../../client/hooks/use-update-effect';
import type { Translator } from '../../locales/translate';
import style from './RadioStations.scss';

interface RadioStationsProps {
  radio: RadioState;
  currentStation?: string;
  search: (query: RadioQuery) => void;
  loadTags: () => void;
  play: (station: RadioStation) => void;
}

const searchDelay = 400;

const describe = ({ country, codec, bitrate }: RadioStation, { t, formatNumber }: Translator) =>
  [country, codec, bitrate ? t('radio.bitrate', { bitrate: formatNumber(bitrate) }) : ''].filter(Boolean).join(' · ');

const RadioStations = ({ radio, currentStation, search, loadTags, play }: RadioStationsProps) => {
  const translator = useTranslation();
  const { t, formatNumber } = translator;
  const { query, stations, tags, loading, error } = radio;
  const [name, setName] = useState(query.name ?? '');
  const delayedName = useDelayedValue(name, searchDelay);

  useEffect(() => {
    loadTags();
    search(query);
    // the most popular stations and the genres load when the panel is first shown
  }, []);

  useUpdateEffect(() => {
    search({ ...query, name: delayedName.trim() || undefined });
  }, [delayedName]);

  return (
    <div className={style.radioStations}>
      <div className={style.controls}>
        <input className={style.search} type="search" placeholder={t('radio.search')} value={name} onChange={(event) => setName(event.target.value)} />
        <select className={style.tags} value={query.tag ?? ''} onChange={(event) => search({ ...query, tag: event.target.value || undefined })}>
          <option value="">{t('radio.allGenres')}</option>
          {tags.map((tag) => (
            <option key={tag.name} value={tag.name}>
              {tag.name} ({formatNumber(tag.stationCount)})
            </option>
          ))}
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
            <span className={style.details}>{describe(station, translator)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RadioStations;
