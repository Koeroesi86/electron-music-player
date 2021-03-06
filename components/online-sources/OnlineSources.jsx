import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import style from './OnlineSources.scss'
import OnlineSourcePanel from '../online-source-panel'

class OnlineSources extends PureComponent {
  render () {
    const { view, setView } = this.props
    return (
      <div className={style.onlineSources}>
        <div className={style.viewControls}>
          <div
            className={classNames(style.view, {
              [style.current]: view === 'shoutcast'
            })}
            onClick={() => setView('shoutcast')}
          >
            Shoutcast
          </div>
          <div
            className={classNames(style.view, {
              [style.current]: view === 'spotify'
            })}
            onClick={() => setView('spotify')}
          >
            Spotify
          </div>
        </div>
        <div className={style.viewPanels}>
          <div className={classNames(style.viewPanel, {
            [style.active]: view === 'shoutcast'
          })}>
            <OnlineSourcePanel
              src={'http://www.shoutcast.com/scradioinwinamp/'}
            />
          </div>
          <div className={classNames(style.viewPanel, {
            [style.active]: view === 'spotify'
          })}>
            <OnlineSourcePanel
              src={'https://open.spotify.com/browse'}
            />
          </div>
        </div>
      </div>
    )
  }
}

OnlineSources.defaultProps = {
  view: 'shoutcast',
  setView: () => {}
}

OnlineSources.propTypes = {
  view: PropTypes.string,
  setView: PropTypes.func
}

export default OnlineSources
