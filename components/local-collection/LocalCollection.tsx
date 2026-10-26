import type { DragEvent } from 'react';
import classNames from 'classnames';
import { FaSyncAlt } from 'react-icons/fa';
import type { LibraryView } from '../../client/redux/types';
import AlbumView from '../album-view';
import TrackView from '../track-view';
import style from './LocalCollection.scss';
import FolderManagement from '../folder-management';
import ViewSwitcher from '../view-switcher/ViewSwitcher';
import type { ViewItem } from '../view-switcher/ViewSwitcher';
import { useTranslation } from '../../client/i18n';

interface LocalCollectionProps {
  view: LibraryView;
  scanningFolder: string | null;
  setView: (view: LibraryView) => void;
  rescanLibrary: () => void;
  addFiles: (files: FileList) => void;
}

const LocalCollection = ({ view, setView, rescanLibrary, scanningFolder, addFiles }: LocalCollectionProps) => {
  const { t } = useTranslation();

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    addFiles(event.dataTransfer.files);
  };

  const views: ViewItem<LibraryView>[] = [
    { view: 'albums', label: t('library.albums'), panel: <AlbumView /> },
    { view: 'tracks', label: t('library.songs'), panel: <TrackView /> },
    { view: 'folders', label: t('library.folders'), panel: <FolderManagement addFiles={addFiles} /> },
  ];

  return (
    <div className={style.localCollection} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      <ViewSwitcher
        views={views}
        current={view}
        setView={setView}
        controls={
          <div className={style.libraryControls}>
            <button onClick={rescanLibrary} disabled={!!scanningFolder} className={classNames({ [style.spinning]: scanningFolder })}>
              <FaSyncAlt />
              {t('library.rescan')}
            </button>
          </div>
        }
      />
    </div>
  );
};

export default LocalCollection;
