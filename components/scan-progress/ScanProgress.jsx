import React, { PureComponent } from 'react'
import classNames from 'classnames'
import PropTypes from 'prop-types'
import style from './ScanProgress.scss'
import { electronAPI } from '../../client/electron-api'

class ScanProgress extends PureComponent {
  componentDidUpdate (prevProps) {
    let {
      current,
      total
    } = this.props
    if (Math.floor((current / total) * 100) !== Math.floor((prevProps.current / prevProps.total) * 100)) {
      this.progressBar.style.width = total === 0 ? '' : `${Math.floor((current / total) * 100)}%`
    }

    if (current !== prevProps.current) {
      this.current.innerText = current
    }

    if (total !== prevProps.total) {
      this.total.innerText = total
    }
  }
  render () {
    let {
      scanningFolder
    } = this.props
    return (
      <div
        className={classNames(style.scanProgress, {
          [style.scanning]: !!scanningFolder
        })}
      >
        <div className={style.container}>
          <span className={style.pre}>
            Scanning&nbsp;<span ref={c => { this.current = c }} />&nbsp;/&nbsp;<span ref={t => { this.total = t }} />&nbsp;in
          </span>
          <span
            onClick={() => electronAPI.openPath(scanningFolder)}
            title={`Click to open ${scanningFolder}`}
            className={style.link}
          >{scanningFolder}</span>
          <div className={style.progressBar}>
            <div
              className={style.current}
              ref={p => { this.progressBar = p }}
            />
          </div>
        </div>
      </div>
    )
  }
}

ScanProgress.defaultProps = {
  current: 0,
  total: 0
}

ScanProgress.propTypes = {
  scanningFolder: PropTypes.string,
  current: PropTypes.number,
  total: PropTypes.number
}

export default ScanProgress
