import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import { basename, extname } from 'path'
import {
  FiBarChart2 as EQIcon,
  FiVolumeX as VolumeOffIcon,
  FiVolume2 as VolumeFullIcon,
  FiSkipForward as ForwardIcon,
  FiSkipBack as BackIcon,
  FiShuffle as ShuffleIcon,
  FiRepeat as RepeatIcon
} from 'react-icons/fi'
import {
  MdPlayCircleOutline as PlayIcon,
  MdPauseCircleOutline as PauseIcon
} from 'react-icons/md'
import Slider from '../slider/Slider'
import { trackType } from '../player-home/PlayerHome'
import style from './PlayerControls.scss'
import ScanProgress from '../scan-progress'
import Time from '../time'

class PlayerControls extends PureComponent {
  constructor (props) {
    super(props)

    this.toggle = this.toggle.bind(this)

    this.props.addPlayStatusListener(isPlaying => {
      if (this.props.isPlaying !== isPlaying) {
        this.props.setPlaying(isPlaying)
      }
    })

    const round = (number) => Math.floor(number * 100)
    this.props.addTimeChangeListener(currentTime => {
      if (round(currentTime) !== round(this.props.currentTime)) {
        this.props.setCurrentTime(currentTime)
      }
    })
  }

  componentDidUpdate (prevProps) {
    if (this.props.currentTime !== prevProps.currentTime) {
      this.props.seek(this.props.currentTime)
    }

    if (this.props.isPlaying !== prevProps.isPlaying) {
      if (this.props.isPlaying) this.props.play()
      else this.props.pause()
    }

    if (this.props.currentSong !== prevProps.currentSong) {
      if (this.props.isPlaying) this.props.play()
    }
  }

  toggle () {
    if (this.props.isPlaying) {
      this.props.pause()
    } else {
      this.props.play()
    }
  }

  get coverStyle () {
    let {
      currentSong,
      port
    } = this.props
    const coverStyle = {}

    if (currentSong && currentSong.picture) {
      const cover = `${basename(currentSong.picture, extname(currentSong.picture))}-optimized.png`
      coverStyle.backgroundImage = `url("http://localhost:${port}/albumart/${cover}")`
    }

    return coverStyle
  }

  render () {
    const {
      currentSong,
      currentTime,
      openEqualizer,
      setVolume,
      volume,
      shuffle,
      repeat,
      previousSong,
      nextSong,
      toggleRepeat,
      toggleShuffle,
      seek,
      isPlaying
    } = this.props
    return (
      <div className={style.controls}>
        <div className={style.controlsPanel}>
          <div className={style.meta}>
            <div className={style.contents}>
              <div
                className={style.picture}
                style={this.coverStyle}
              />
              <div className={style.details}>
                <div className={style.title}>{currentSong ? currentSong.title : 'None'}</div>
                <div className={style.album}>{currentSong ? currentSong.album : 'None'}</div>
                <div className={style.artist}>{currentSong ? currentSong.artist : 'None'}</div>
                <div className={style.time}>
                  <Time seconds={currentTime} /> / <Time seconds={currentSong ? currentSong.duration : 0} />
                </div>
              </div>
            </div>
          </div>
          <div className={style.controlsContainer}>
            <div className={style.progress}>
              <Slider
                min={0}
                max={currentSong ? currentSong.duration : 0}
                step={0.0001}
                value={currentTime}
                onInput={e => {
                  const value = parseFloat(e.target.value)
                  if (currentTime !== value) seek(value)
                }}
                onChange={() => {
                }}
              />
            </div>
            <div className={style.mainControlContainer}>
              <div className={style.mainControlButtons}>
                <button
                  className={style.controlButton}
                  onClick={previousSong}
                  title={'Previous'}
                >
                  <BackIcon size={'16px'} />
                </button>
                <button
                  onClick={this.toggle}
                  className={classNames(style.playToggleButton, {
                    [style.playing]: isPlaying
                  })}
                  disabled={!currentSong}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  <PauseIcon className={style.pauseIcon} size={'40px'} />
                  <PlayIcon className={style.playIcon} size={'40px'} />
                </button>
                <button
                  className={style.controlButton}
                  onClick={nextSong}
                  title={'Next'}
                >
                  <ForwardIcon size={'16px'} />
                </button>
                <button
                  className={classNames(style.controlButton, {
                    [style.active]: shuffle
                  })}
                  onClick={toggleShuffle}
                  title={'Shuffle'}
                >
                  <ShuffleIcon size={'12px'} />
                </button>
                <button
                  className={classNames(style.controlButton, {
                    [style.active]: repeat
                  })}
                  onClick={toggleRepeat}
                  title={'Repeat'}
                >
                  <RepeatIcon size={'12px'} />
                </button>
                <ScanProgress />
              </div>
              <div className={style.volume}>
                <div
                  onClick={openEqualizer}
                  className={style.icon}
                >
                  <EQIcon size={'16px'} />
                </div>
                <div
                  className={style.icon}
                  onClick={() => {
                    setVolume(0)
                  }}
                >
                  <VolumeOffIcon size={'16px'} />
                </div>
                <div className={style.slider}>
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onInput={e => {
                      setVolume(e.target.value)
                    }}
                    onChange={() => {}}
                  />
                </div>
                <div
                  className={style.icon}
                  onClick={() => {
                    setVolume(1)
                  }}
                >
                  <VolumeFullIcon size={'16px'} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

PlayerControls.defaultProps = {
  currentSong: null,
  currentTime: 0,
  port: '3000',
  setCurrentTime: () => {},
  openEqualizer: () => {},
  setVolume: () => {},
  setPlaying: () => {},
  volume: 0.5,
  addPlayStatusListener: () => {},
  addTimeChangeListener: () => {},
  seek: () => {},
  play: () => {},
  pause: () => {},
  shuffle: false,
  repeat: false,
  isPlaying: false,
  toggleRepeat: () => {},
  toggleShuffle: () => {},
  nextSong: () => {},
  previousSong: () => {}
}

PlayerControls.propTypes = {
  currentSong: PropTypes.shape(trackType),
  currentTime: PropTypes.number,
  addPlayStatusListener: PropTypes.func,
  addTimeChangeListener: PropTypes.func,
  seek: PropTypes.func,
  port: PropTypes.string,
  setCurrentTime: PropTypes.func,
  openEqualizer: PropTypes.func,
  play: PropTypes.func,
  pause: PropTypes.func,
  setVolume: PropTypes.func,
  setPlaying: PropTypes.func,
  volume: PropTypes.number,
  shuffle: PropTypes.bool,
  repeat: PropTypes.bool,
  isPlaying: PropTypes.bool,
  toggleRepeat: PropTypes.func,
  toggleShuffle: PropTypes.func,
  nextSong: PropTypes.func,
  previousSong: PropTypes.func
}

export default PlayerControls
