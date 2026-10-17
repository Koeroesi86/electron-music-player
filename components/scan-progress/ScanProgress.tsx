import { PureComponent } from 'react'
import classNames from 'classnames'
import style from './ScanProgress.scss'
import { electronAPI } from '../../client/electron-api'

interface ScanProgressProps {
  current: number
  total: number
  scanningFolder: string | null
}

class ScanProgress extends PureComponent<ScanProgressProps> {
  private current: HTMLSpanElement | null = null
  private total: HTMLSpanElement | null = null
  private progressBar: HTMLDivElement | null = null

  componentDidUpdate (prevProps: ScanProgressProps) {
    const {
      current,
      total
    } = this.props
    if (this.progressBar && Math.floor((current / total) * 100) !== Math.floor((prevProps.current / prevProps.total) * 100)) {
      this.progressBar.style.width = total === 0 ? '' : `${Math.floor((current / total) * 100)}%`
    }

    if (this.current && current !== prevProps.current) {
      this.current.innerText = `${current}`
    }

    if (this.total && total !== prevProps.total) {
      this.total.innerText = `${total}`
    }
  }

  render () {
    const {
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
            onClick={() => scanningFolder && electronAPI.openPath(scanningFolder)}
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

export default ScanProgress
