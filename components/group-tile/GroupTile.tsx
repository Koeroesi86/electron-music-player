import type { GroupSummary } from '../../types/library';
import { getCoverUrl } from '../../client/cover-url';
import { useTranslation } from '../../client/i18n';
import style from './GroupTile.scss';

interface GroupTileProps {
  group: GroupSummary;
  /** What a group without a name is called */
  unknownName: string;
  open: (group: GroupSummary) => void;
}

/** An artist or album artist as a tile: the cover, the name and how many albums and tracks it has */
const GroupTile = ({ group, unknownName, open }: GroupTileProps) => {
  const { t } = useTranslation();
  const name = group.name || unknownName;

  return (
    <button type="button" className={style.groupTile} onClick={() => open(group)}>
      <span className={style.cover} style={group.cover ? { backgroundImage: `url("${getCoverUrl(group.cover)}")` } : undefined} />
      <span className={style.name} title={name}>
        {name}
      </span>
      <span className={style.counts}>{`${t('groups.albumCount', { count: group.albumCount })} · ${t('groups.trackCount', { count: group.trackCount })}`}</span>
    </button>
  );
};

export default GroupTile;
