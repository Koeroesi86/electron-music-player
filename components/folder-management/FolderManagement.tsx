import { useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { Folder } from '../../types/library';
import style from './FolderManagement.scss';

interface FolderManagementProps {
  folders: Folder[];
  addFiles: (files: FileList) => void;
}

const FolderManagement = ({ folders, addFiles }: FolderManagementProps) => {
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
      <div className={style.sectionTitle}>Folders</div>
      <div className={style.folders}>
        {folders.map((folder) => (
          <div key={`folder-${folder.path}`} className={style.folder} title={folder.path}>
            {folder.path}
          </div>
        ))}
        <div className={style.addItems} onClick={() => upload.current?.click()}>
          Drop music folders here
          <input type="file" ref={upload} className={style.fileInput} multiple onChange={handleFileChange} />
        </div>
      </div>
    </section>
  );
};

export default FolderManagement;
