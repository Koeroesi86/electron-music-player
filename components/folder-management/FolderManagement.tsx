import { useState } from 'react';
import classNames from 'classnames';
import type { Folder } from '../../types/library';
import Confirm from '../confirm';
import style from './FolderManagement.scss';
import { useTranslation } from '../../client/i18n';

interface FolderManagementProps {
  folders: Folder[];
  offlineFolders: string[];
  addFolders: () => void;
  removeFolder: (path: string) => void;
}

const FolderManagement = ({ folders, offlineFolders, addFolders, removeFolder }: FolderManagementProps) => {
  const { t } = useTranslation();
  const [removing, setRemoving] = useState<string>();

  return (
    <section className={style.folderManagement}>
      <div className={style.sectionTitle}>{t('folders.title')}</div>
      <div className={style.folders}>
        {folders.map((folder) => (
          <div key={`folder-${folder.path}`} className={classNames(style.folder, { [style.offline]: offlineFolders.includes(folder.path) })}>
            <span className={style.path} title={folder.path}>
              {folder.path}
            </span>
            {offlineFolders.includes(folder.path) && (
              <span className={style.offlineLabel} title={t('folders.offlineHint')}>
                {t('folders.offline')}
              </span>
            )}
            <button className={style.remove} onClick={() => setRemoving(folder.path)}>
              {t('folders.remove')}
            </button>
          </div>
        ))}
        <button className={style.addItems} onClick={addFolders}>
          {t('folders.add')}
        </button>
        <div className={style.dropHint}>{t('folders.drop')}</div>
      </div>
      <Confirm
        message={removing ? t('folders.removeConfirm', { path: removing }) : null}
        confirmLabel={t('folders.removeLabel')}
        cancelLabel={t('folders.keep')}
        confirm={() => {
          if (removing) removeFolder(removing);
          setRemoving(undefined);
        }}
        cancel={() => setRemoving(undefined)}
      />
    </section>
  );
};

export default FolderManagement;
