import { memo } from 'react';
import type { MouseEventHandler, ReactNode } from 'react';
import classNames from 'classnames';
import type { Track } from '../../types/library';
import style from './TrackViewItem.scss';
import Time from '../time';

/** The header row displays labels in place of the track values */
export type TrackLabels = Record<'duration' | 'artist' | 'year' | 'album' | 'track' | 'title', string>;

interface TrackViewItemFieldProps {
  onClick?: MouseEventHandler<HTMLDivElement>;
  className?: string;
  children?: ReactNode;
}

const TrackViewItemField = ({ onClick = () => {}, className = '', children = null }: TrackViewItemFieldProps) => (
  <div className={classNames(style.field, className)} onClick={onClick}>
    {children}
  </div>
);

interface TrackViewItemProps {
  track: Track | TrackLabels;
  isHeader?: boolean;
  isSelected?: boolean;
  isCurrent?: boolean;
  clickTrack?: (track: Track) => void;
  doubleClickTrack?: (track: Track) => void;
}

const TrackViewItem = ({
  track,
  isSelected = false,
  isCurrent = false,
  isHeader = false,
  clickTrack = () => {},
  doubleClickTrack = () => {},
}: TrackViewItemProps) => (
  <div
    className={classNames(style.trackViewItem, {
      [style.header]: isHeader,
      [style.selected]: isSelected,
      [style.current]: isCurrent,
    })}
    onClick={() => 'path' in track && clickTrack(track)}
    onDoubleClick={() => 'path' in track && doubleClickTrack(track)}
  >
    <TrackViewItemField className={style.duration}>
      {typeof track.duration === 'string' ? track.duration : <Time seconds={track.duration} />}
    </TrackViewItemField>
    <TrackViewItemField className={style.artist}>{track.artist || '-'}</TrackViewItemField>
    <TrackViewItemField className={style.year}>{track.year || '-'}</TrackViewItemField>
    <TrackViewItemField className={style.album}>{track.album || '-'}</TrackViewItemField>
    <TrackViewItemField className={style.trackNo}>{track.track || '-'}</TrackViewItemField>
    <TrackViewItemField className={style.title}>{track.title || '-'}</TrackViewItemField>
  </div>
);

export default memo(TrackViewItem);
