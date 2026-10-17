import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import LocalCollection from '../local-collection'
import NowPlaying from '../now-playing'
import OnlineSources from '../online-sources'
import Equalizer from '../equalizer'
import style from './PlayerTabs.scss'

function PlayerTabs ({ tab = 'local', addFiles = () => {} }) {
  return (
    <div className={style.collection}>
      <div className={classNames(style.tab, {
        [style.active]: tab === 'local'
      })}>
        <LocalCollection addFiles={addFiles} />
      </div>
      <div className={classNames(style.tab, {
        [style.active]: tab === 'now-playing'
      })}>
        <NowPlaying />
      </div>
      <div className={classNames(style.tab, {
        [style.active]: tab === 'online-sources'
      })}>
        <OnlineSources />
      </div>
      <div className={classNames(style.tab, {
        [style.active]: tab === 'equalizer'
      })}>
        <Equalizer />
      </div>
    </div>
  )
}

PlayerTabs.propTypes = {
  tab: PropTypes.string,
  addFiles: PropTypes.func
}

export default PlayerTabs
