import React, { Component } from 'react'
import PropTypes from 'prop-types'
import moment from 'moment'
import classNames from 'classnames'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons'
import style from './PlayerHome.scss'
import AlbumView from '../album-view'
import TrackView from '../track-view'
import AlbumDetails from '../album-details'
import Equalizer from '../equalizer'
import Confirm from '../confirm'
import { shell } from 'electron'
import NowPlaying from '../now-playing'
import PlayerControls from '../player-controls'
import FolderManagement from '../folder-management'
import AudioComponent from '../audio-component'
// import Fuzz from '../fuzz'

export function formatTime (seconds) {
  return moment(Math.floor(parseFloat(seconds) * 1000), 'x', true).format('HH:mm:ss')
}

export default class PlayerHome extends Component {
  constructor (props) {
    super(props)

    this.state = {
      audioSource: null,
      audioContext: new AudioContext(), // eslint-disable-line no-undef
      confirmMessage: null
    }

    this.handleDrop = this.handleDrop.bind(this)
    this.handleFileChange = this.handleFileChange.bind(this)
    this.play = this.play.bind(this)
    this.pause = this.pause.bind(this)
    this.confirm = this.confirm.bind(this)
    this.handleCancel = this.handleCancel.bind(this)
    this.handleConfirm = this.handleConfirm.bind(this)
    this.confirmCallback = () => {}
  }

  confirm (message, callback) {
    this.setState(() => {
      this.confirmCallback = callback
      return { confirmMessage: message }
    })
  }

  checkFile (files) {
    let contained = false
    const { folders } = this.props

    Array.prototype.forEach.call(files, file => {
      // exact match
      if (folders.find(folder => folder.path === file.path)) {
        contained = file.path
      }

      // parent directory
      if (folders.find(folder => folder.path.indexOf(file.path) === 0)) {
        contained = file.path
      }

      // child directory
      if (folders.find(folder => file.path.indexOf(folder.path) === 0)) {
        contained = file.path
      }
    })

    return contained
  }

  handleDrop (event) {
    event.preventDefault()
    event.stopPropagation()
    const { files } = event.dataTransfer

    if (files.length > 0) {
      let contained = this.checkFile(files)

      if (contained) {
        this.confirm(`Are you sure you want to add this folder? ${contained}`, () => {
          this.props.addFiles(files)
        })
      } else {
        this.props.addFiles(files)
      }
    }
  }

  handleFileChange (event) {
    event.stopPropagation()
    event.preventDefault()
    const { files } = event.target
    if (files.length > 0) {
      let contained = this.checkFile(files)

      if (contained) {
        this.confirm(`Are you sure you want to add this folder? ${contained}`, () => {
          this.props.addFiles(files)
        })
      } else {
        this.props.addFiles(files)
      }
    }
  }

  handleCancel () {
    this.confirmCallback = () => {}
    this.setState({ confirmMessage: null })
  }

  handleConfirm () {
    this.confirmCallback()
    this.confirmCallback = () => {}
    this.setState({ confirmMessage: null })
  }

  play () {
    if (this.audio) this.audio.play()
  }

  pause () {
    if (this.audio) this.audio.pause()
  }

  render () {
    const { view, setView, rescanLibrary, scanningFolder, tracks, trackEnded } = this.props
    const { audioContext, audioSource, confirmMessage } = this.state
    return (
      <div
        className={style.PlayerHome}
        onDragOver={e => e.preventDefault()}
        onDrop={this.handleDrop}
      >
        <div className={style.mainPanel}>
          <PlayerControls
            play={this.play}
            pause={this.pause}
          />
          <div className={style.library}>
            <div className={style.manageLibrary}>
              <FolderManagement handleFileChange={this.handleFileChange} />
            </div>
            <div className={style.collection}>
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
                <div className={style.libraryControls}>
                  <button
                    onClick={rescanLibrary}
                    disabled={!!scanningFolder}
                    className={classNames({
                      [style.spinning]: scanningFolder
                    })}
                  >
                    <FontAwesomeIcon icon={faSyncAlt} size='sm' />
                    Rescan
                  </button>
                </div>
              </div>
              <div className={style.viewPanels}>
                {tracks.length === 0 && (
                  <div>Library placeholder</div>
                )}
                <div className={classNames(style.albums, {
                  [style.active]: view === 'albums'
                })}>
                  <AlbumView />
                </div>
                <div className={classNames(style.albums, {
                  [style.active]: view === 'tracks'
                })}>
                  <TrackView />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={style.nowPlaying}>
          <NowPlaying />
        </div>
        <AlbumDetails />
        <Equalizer
          source={audioSource}
          context={audioContext}
        />
        <Confirm
          message={confirmMessage}
          confirm={this.handleConfirm}
          cancel={this.handleCancel}
        />
        <div
          className={classNames(style.scanningFolder, {
            [style.show]: scanningFolder
          })}
        >
          Currently scanning:&nbsp;
          <a
            onClick={() => shell.openItem(scanningFolder)}
            title={`Click to open ${scanningFolder}`}
          >
            {scanningFolder}
          </a>
        </div>
        <AudioComponent
          createSource={node => {
            this.audio = node
            this.setState({
              audioSource: this.state.audioContext.createMediaElementSource(node)
            })
          }}
        />
      </div>
    )
  }
}

PlayerHome.defaultProps = {
  view: 'albums',
  addFiles: () => {},
  trackEnded: () => {},
  setView: () => {},
  setCurrentTime: () => {},
  folders: [],
  tracks: [],
  currentSong: null,
  currentTime: 0,
  currentTimeFPS: 30,
  volume: 0.5,
  rescanLibrary: () => {}
}

export const trackType = {
  album: PropTypes.string,
  artist: PropTypes.string,
  disk: PropTypes.string,
  duration: PropTypes.number,
  genre: PropTypes.string,
  path: PropTypes.string,
  picture: PropTypes.string,
  title: PropTypes.string,
  track: PropTypes.string,
  year: PropTypes.string
}

PlayerHome.propTypes = {
  view: PropTypes.string,
  addFiles: PropTypes.func,
  trackEnded: PropTypes.func,
  rescanLibrary: PropTypes.func,
  setView: PropTypes.func,
  folders: PropTypes.arrayOf(
    PropTypes.shape({
      lastModified: PropTypes.number,
      path: PropTypes.string
    })
  ),
  scanningFolder: PropTypes.string,
  tracks: PropTypes.arrayOf(PropTypes.shape(trackType))
}
