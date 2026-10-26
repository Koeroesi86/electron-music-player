import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { Folder } from '../../types/library';
import Confirm from '../confirm';
import style from './FolderManagement.scss';
import { useTranslation } from '../../client/i18n';

interface FolderManagementProps {
  folders: Folder[];
  addFiles: (files: FileList) => void;
  removeFolder: (path: string) => void;
}

const FolderManagement = ({ folders, addFiles, removeFolder }: FolderManagementProps) => {
  const { t } = useTranslation();
  const [removing, setRemoving] = useState<string>();
  const upload = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (upload.current) Object.assign(upload.current, { allowdirs: true, webkitdirectory: true });
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    event.preventDefault();
    const { files } = event.target;

    if (files) addFiles(files);
  };

  return (
    <section className={style.folderManagement}>
      <div className={style.sectionTitle}>{t('folders.title')}</div>
      <div className={style.folders}>
        {folders.map((folder) => (
          <div key={`folder-${folder.path}`} className={style.folder}>
            <span className={style.path} title={folder.path}>
              {folder.path}
            </span>
            <button className={style.remove} onClick={() => setRemoving(folder.path)}>
              {t('folders.remove')}
            </button>
          </div>
        ))}
        <div className={style.addItems} onClick={() => upload.current?.click()}>
          {t('folders.drop')}
          <input type="file" ref={upload} className={style.fileInput} multiple onChange={handleFileChange} />
        </div>
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
