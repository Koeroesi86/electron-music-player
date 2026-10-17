import { PureComponent } from 'react'
import type { DragEvent } from 'react'
import classNames from 'classnames'
import { FaSyncAlt } from 'react-icons/fa'
import type { LibraryView } from '../../client/redux/types'
import AlbumView from '../album-view'
import TrackView from '../track-view'
import style from './LocalCollection.scss'
import FolderManagement from '../folder-management'

interface LocalCollectionProps {
  view: LibraryView
  scanningFolder: string | null
  setView: (view: LibraryView) => void
  rescanLibrary: () => void
  addFiles: (files: FileList) => void
}

class LocalCollection extends PureComponent<LocalCollectionProps> {
  handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const { files } = event.dataTransfer

    this.props.addFiles(files)
  }

  render () {
    const { view, setView, rescanLibrary, scanningFolder, addFiles } = this.props
    return (
      <div
        className={style.localCollection}
        onDragOver={e => e.preventDefault()}
        onDrop={this.handleDrop}
      >
        <div className={style.viewControls}>
          <div
            className={classNames(style.view, {
              [style.current]: view === 'albums'
            })}
            onClick={() => setView('albums')}
          >
            Albums
          </div>
          <div
            className={classNames(style.view, {
              [style.current]: view === 'tracks'
            })}
            onClick={() => setView('tracks')}
          >
            Songs
          </div>
          <div
            className={classNames(style.view, {
              [style.current]: view === 'folders'
            })}
            onClick={() => setView('folders')}
          >
            Folders
          </div>
          <div className={style.libraryControls}>
            <button
              onClick={rescanLibrary}
              disabled={!!scanningFolder}
              className={classNames({
                [style.spinning]: scanningFolder
              })}
            >
              <FaSyncAlt />
              Rescan
            </button>
          </div>
        </div>
        <div className={style.viewPanels}>
          <div className={classNames(style.viewPanel, {
            [style.active]: view === 'albums'
          })}>
            <AlbumView />
          </div>
          <div className={classNames(style.viewPanel, {
            [style.active]: view === 'tracks'
          })}>
            <TrackView />
          </div>
          <div className={classNames(style.viewPanel, {
            [style.active]: view === 'folders'
          })}>
            <FolderManagement addFiles={addFiles} />
          </div>
        </div>
      </div>
    )
  }
}

export default LocalCollection
