import React from 'react'
import classNames from 'classnames'
import PropTypes from 'prop-types'
import {
  MdEqualizer as EQIcon,
  MdSettings as SettingsIcon,
  MdCloudQueue as ShoutCastIcon,
  MdMusicNote as NowPlayingIcon,
  MdQueueMusic as LocalLibraryIcon
} from 'react-icons/md'
import style from './Navigation.scss'

function Navigation ({ setTab = () => {}, tab = 'local' }) {
  return (
    <div className={style.navigation}>
      <div
        onClick={() => setTab('now-playing')}
        className={classNames(style.item, {
          [style.active]: tab === 'now-playing'
        })}
      >
        <NowPlayingIcon size={'12px'} />
        <span className={style.label}>Now playing</span>
      </div>
      <div
        onClick={() => setTab('local')}
        className={classNames(style.item, {
          [style.active]: tab === 'local'
        })}
      >
        <LocalLibraryIcon size={'12px'} />
        <span className={style.label}>Local collection</span>
      </div>
      <div
        onClick={() => setTab('online-sources')}
        className={classNames(style.item, {
          [style.active]: tab === 'online-sources'
        })}
      >
        <ShoutCastIcon size={'12px'} />
        <span className={style.label}>Online</span>
      </div>
      <div
        onClick={() => setTab('equalizer')}
        className={classNames(style.item, {
          [style.active]: tab === 'equalizer'
        })}
      >
        <EQIcon size={'12px'} />
        <span className={style.label}>Equalizer</span>
      </div>
      <div
        onClick={() => {}}
        className={classNames(style.item, {
          [style.active]: tab === 'settings'
        })}
      >
        <SettingsIcon size={'12px'} />
        <span className={style.label}>Settings</span>
      </div>
    </div>
  )
}

Navigation.propTypes = {
  setTab: PropTypes.func,
  tab: PropTypes.string
}

export default Navigation
