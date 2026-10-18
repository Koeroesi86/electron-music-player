import { PureComponent } from 'react'
import classNames from 'classnames'
import type { Folder } from '../../types/library'
import { electronAPI } from '../../client/electron-api'
import style from './PlayerHome.scss'
import AlbumDetails from '../album-details'
import Confirm from '../confirm'
import PlayerControls from '../player-controls'
import AudioComponent from '../audio-component'
import TitleBar from '../title-bar'
import Navigation from '../navigation'
import AudioSpectrum from '../audio-spectrum'
import PlayerTabs from '../player-tabs'

// Electron can only blur behind the window on Windows and macOS
const isLinux = navigator.userAgent.includes('Linux')

interface PlayerHomeProps {
  maximized: boolean
  enableTransparency: boolean
  loaded: boolean
  folders: Folder[]
  addFiles: (files: FileList) => void
  onUnload: () => void
}

interface PlayerHomeState {
  confirmMessage: string | null
}

export default class PlayerHome extends PureComponent<PlayerHomeProps, PlayerHomeState> {
  static defaultProps = {
    enableTransparency: true
  }

  state: PlayerHomeState = {
    confirmMessage: null
  }

  private confirmCallback: () => void = () => {}

  constructor (props: PlayerHomeProps) {
    super(props)

    window.addEventListener('beforeunload', () => {
      this.props.onUnload()
    })
  }

  confirm = (message: string, callback: () => void) => {
    this.setState(() => {
      this.confirmCallback = callback
      return { confirmMessage: message }
    })
  }

  checkFile (files: FileList) {
    let contained: string | false = false
    const { folders } = this.props

    Array.from(files).forEach(file => {
      const filePath = electronAPI.getPathForFile(file)

      // exact match
      if (folders.find(folder => folder.path === filePath)) {
        contained = filePath
      }

      // parent directory
      if (folders.find(folder => folder.path.indexOf(filePath) === 0)) {
        contained = filePath
      }

      // child directory
      if (folders.find(folder => filePath.indexOf(folder.path) === 0)) {
        contained = filePath
      }
    })

    return contained
  }

  addFiles = (files: FileList) => {
    if (files.length > 0) {
      const contained = this.checkFile(files)

      if (contained) {
        this.confirm(`Are you sure you want to add this folder? ${contained}`, () => {
          this.props.addFiles(files)
        })
      } else {
        this.props.addFiles(files)
      }
    }
  }

  handleCancel = () => {
    this.confirmCallback = () => {}
    this.setState({ confirmMessage: null })
  }

  handleConfirm = () => {
    this.confirmCallback()
    this.confirmCallback = () => {}
    this.setState({ confirmMessage: null })
  }

  render () {
    const { maximized, enableTransparency, loaded } = this.props
    const { confirmMessage } = this.state
    return (
      <div
        className={classNames(style.playerHome, {
          [style.opaque]: enableTransparency,
          [style.maximized]: maximized,
          [style.loaded]: loaded,
          [style.noBlur]: isLinux
        })}
      >
        <div className={style.wrapper}>
          <div className={style.mainPanel}>
            <div className={style.library}>
              <div className={style.manageLibrary}>
                <div className={style.manageLibraryPanel}>
                  <TitleBar />
                  <div className={style.navigationContainer}>
                    <AudioSpectrum
                      width={180}
                      height={80}
                      meterColor={'rgba(255, 255, 255, 0.4)'}
                      capColor={'rgba(255, 255, 255, 0.8)'}
                      capHeight={1}
                      meterCount={45}
                      meterWidth={2}
                      gap={2}
                    />
                    <Navigation />
                  </div>
                </div>
              </div>
              <PlayerTabs addFiles={this.addFiles} />
            </div>
          </div>
          <PlayerControls />
        </div>
        <AlbumDetails />
        <Confirm
          message={confirmMessage}
          confirm={this.handleConfirm}
          cancel={this.handleCancel}
        />
        <AudioComponent />
      </div>
    )
  }
}
