import { useEffect, useState } from 'react';
import classNames from 'classnames';
import { MdCheck as AddedIcon, MdAddToQueue as QueueIcon } from 'react-icons/md';
import type { Track } from '../../types/library';
import { useTranslation } from '../../client/i18n';
import style from './AddToQueue.scss';

interface AddToQueueProps {
  /** The tracks to add, an album or a favourite gives them once they are fetched */
  getTracks: () => Promise<Track[]>;
  add: (tracks: Track[]) => void;
  /** Shows the words next to the icon, for a button that stands on its own */
  withLabel?: boolean;
  className?: string;
}

/** How long the button shows that the tracks are in the queue */
const addedFor = 1500;

/** The button of a track, an album or a favourite that puts its tracks at the end of the queue */
const AddToQueue = ({ getTracks, add, withLabel = false, className }: AddToQueueProps) => {
  const { t } = useTranslation();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return undefined;

    const timer = setTimeout(() => setAdded(false), addedFor);
    return () => clearTimeout(timer);
  }, [added]);

  const label = t(added ? 'queue.added' : 'queue.add');

  return (
    <button
      type="button"
      className={classNames(style.addToQueue, { [style.withLabel]: withLabel, [style.added]: added }, className)}
      title={label}
      aria-label={label}
      // the button sits in rows that select and play on click
      onClick={(event) => {
        event.stopPropagation();
        getTracks()
          .then((tracks) => {
            add(tracks);
            setAdded(true);
          })
          .catch(console.error);
      }}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {added ? <AddedIcon size="16px" /> : <QueueIcon size="16px" />}
      {withLabel && <span>{t('queue.addShort')}</span>}
    </button>
  );
};

export default AddToQueue;
