import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import style from './AudioSpectrum.scss'

// @see https://github.com/hu-ke/react-audio-spectrum
class AudioSpectrum extends PureComponent {
  constructor (props) {
    super(props)

    this.playStatus = 'PAUSED'
  }

  componentDidMount () {
    if (this.canvas) {
      this.canvasContext = this.canvas.getContext('2d')
      this.setupAudioNode()
    }

    this.props.addPlayStatusListener(isPlaying => {
      this.playStatus = isPlaying ? 'PLAYING' : 'PAUSED'

      if (isPlaying) {
        if (!this.analyser) this.setupAudioNode()
        clearTimeout(this.timer)
        this.drawSpectrum()
      } else {
        clearTimeout(this.timer)
        window.cancelAnimationFrame(this.animationId)
      }
    })
  }

  componentDidUpdate (prevProps) {
    if (this.canvas) {
      this.canvasContext = this.canvas.getContext('2d')
      this.setupAudioNode()
    }
  }

  drawSpectrum () {
    const { capColor, capHeight, meterCount, meterWidth, meterColor, gap, fps } = this.props
    const canvasWidth = this.canvas.width
    const canvasHeight = this.canvas.height - capHeight
    const capYPositionArray = [] // store the vertical position of hte caps for the previous frame
    let gradient = this.canvasContext.createLinearGradient(0, 0, 0, 300)

    if (typeof meterColor === 'string') {
      gradient = meterColor
    } else if (meterColor.constructor === Array) {
      let stops = meterColor
      let len = stops.length
      for (let i = 0; i < len; i++) {
        gradient.addColorStop(stops[i]['stop'], stops[i]['color'])
      }
    }

    const clearCanvas = () => this.canvasContext.clearRect(0, 0, canvasWidth, canvasHeight + capHeight)
    const getY = (value) => (255 - value) * (canvasHeight) / 255
    const drawRect = (i, y, height) => this.canvasContext.fillRect(i * (meterWidth + gap), y, meterWidth, height)
    const drawCap = (i, y) => drawRect(i, y, capHeight)
    const drawMeterBar = (i, y) => drawRect(i, y, canvasHeight - y + capHeight)

    const drawMeter = () => {
      if (this.analyser) {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount) // item value of array: 0 - 255
        // this.analyser.getByteTimeDomainData(dataArray)
        this.analyser.getByteFrequencyData(dataArray)
        if (this.playStatus === 'PAUSED') {
          for (let i = dataArray.length - 1; i >= 0; i--) {
            dataArray[i] = 0
          }
          let allCapsReachBottom = !capYPositionArray.some(cap => cap > 0)
          if (allCapsReachBottom) {
            clearCanvas()
            if (this.animationId) window.cancelAnimationFrame(this.animationId)
            return
          }
        }

        let step = Math.round(dataArray.length / meterCount) // sample limited data from the total array
        clearCanvas()
        for (let i = 0; i < meterCount; i++) {
          let value = dataArray[i * step]
          if (capYPositionArray.length < Math.round(meterCount)) {
            capYPositionArray.push(value)
          }

          this.canvasContext.fillStyle = capColor
          // draw the cap, with transition effect
          if (value < capYPositionArray[i]) {
            let preValue = --capYPositionArray[i]
            let y = getY(preValue)
            drawCap(i, y)
          } else {
            let y = getY(value)
            drawCap(i, y)
            capYPositionArray[i] = value
          }

          this.canvasContext.fillStyle = gradient // set the filllStyle to gradient for a better look

          let y = getY(value) + capHeight
          drawMeterBar(i, y) // the meter
        }
      }

      // this.animationId = window.requestAnimationFrame(drawMeter)
      this.timer = setTimeout(() => {
        this.animationId = window.requestAnimationFrame(drawMeter)
      }, 1000 / fps)
    }

    this.animationId = window.requestAnimationFrame(drawMeter)
  }

  setupAudioNode () {
    this.analyser = this.props.createAnalyser()
  }

  render () {
    return (
      <canvas
        className={style.audioSpectrum}
        ref={c => {
          this.canvas = c
        }}
        width={this.props.width}
        height={this.props.height}
      />
    )
  }
}

AudioSpectrum.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  capColor: PropTypes.string,
  createAnalyser: PropTypes.func,
  addPlayStatusListener: PropTypes.func,
  capHeight: PropTypes.number,
  meterWidth: PropTypes.number,
  meterCount: PropTypes.number,
  meterColor: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.shape({
      stop: PropTypes.number,
      color: PropTypes.string
    }))
  ]),
  gap: PropTypes.number,
  fps: PropTypes.number
}

AudioSpectrum.defaultProps = {
  width: 200,
  height: 150,
  createAnalyser: () => false,
  addPlayStatusListener: () => {},
  capColor: '#FFF',
  capHeight: 2,
  meterWidth: 2,
  meterCount: 40 * (2 + 2),
  meterColor: [
    { stop: 0, color: '#f00' },
    { stop: 0.5, color: '#0CD7FD' },
    { stop: 1, color: 'red' }
  ],
  gap: 10,
  fps: 30
}

export default AudioSpectrum
