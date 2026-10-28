import type { Track } from '../../types/library';
import { audioFormatLabel } from '../../client/audio-format-label';
import style from './AudioFormatBadge.scss';

/** The format of a track as a small badge, nothing for a track that has none */
const AudioFormatBadge = ({ track }: { track: Track }) => {
  const label = audioFormatLabel(track);

  return label ? <span className={style.badge}>{label}</span> : null;
};

export default AudioFormatBadge;
