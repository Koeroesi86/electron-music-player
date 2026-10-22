import { useEffect, useState } from 'react';
import classNames from 'classnames';
import { MdPlayArrow as PlayIcon } from 'react-icons/md';
import type { RadioQuery, RadioStation } from '../../types/radio';
import type { RadioState } from '../../client/redux/radio/reducer';
import { useDelayedValue } from '../../client/hooks/use-delayed-value';
import { useUpdateEffect } from '../../client/hooks/use-update-effect';
import style from './RadioStations.scss';

interface RadioStationsProps {
  radio: RadioState;
  currentStation?: string;
  search: (query: RadioQuery) => void;
  loadTags: () => void;
  play: (station: RadioStation) => void;
}

const searchDelay = 400;

const describe = ({ country, codec, bitrate }: RadioStation) => [country, codec, bitrate ? `${bitrate} kbps` : ''].filter(Boolean).join(' · ');

const RadioStations = ({ radio, currentStation, search, loadTags, play }: RadioStationsProps) => {
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
        <input className={style.search} type="search" placeholder="Search stations" value={name} onChange={(event) => setName(event.target.value)} />
        <select className={style.tags} value={query.tag ?? ''} onChange={(event) => search({ ...query, tag: event.target.value || undefined })}>
          <option value="">All genres</option>
          {tags.map((tag) => (
            <option key={tag.name} value={tag.name}>
              {tag.name} ({tag.stationCount})
            </option>
          ))}
        </select>
      </div>
      <div className={style.stations}>
        {error && <div className={style.message}>{error}</div>}
        {loading && <div className={style.message}>Loading stations…</div>}
        {!loading && !error && stations.length === 0 && <div className={style.message}>No stations found</div>}
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
            <span className={style.details}>{describe(station)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RadioStations;
