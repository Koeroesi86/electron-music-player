import { PureComponent } from 'react'
import style from './Equalizer.scss'
import Slider from '../slider/Slider'

interface Band {
  type?: BiquadFilterType
  label: string
  value: number
  frequency: number
}

interface ConnectedBand {
  band: BiquadFilterNode
  invert: GainNode | undefined
  gainContext: GainNode
}

interface EqualizerProps {
  gains: number[]
  bands: Band[]
  createBiquadFilter: () => BiquadFilterNode
  createGain: () => GainNode
  connectDestination: (node: AudioNode) => void
  connectToSource: (node: AudioNode) => void
  onAudioMounted: (listener: () => void) => void
}

interface EqualizerState {
  connectedBands: ConnectedBand[] | null
}

class Equalizer extends PureComponent<EqualizerProps, EqualizerState> {
  static defaultProps = {
    gains: [
      -40,
      -40,
      -40,
      -40,
      -40,
      -40,
      -40,
      -40,
      -40,
      -40,
      -40,
      -40
    ],
    bands: [
      {
        type: 'lowpass',
        label: '70',
        value: 0,
        frequency: 70
      },
      {
        label: '180',
        value: 0,
        frequency: 180
      },
      {
        label: '320',
        value: 0,
        frequency: 320
      },
      {
        label: '600',
        value: 0,
        frequency: 600
      },
      {
        label: '1k',
        value: 0,
        frequency: 1000
      },
      {
        label: '3k',
        value: 0,
        frequency: 3000
      },
      {
        label: '6k',
        value: 0,
        frequency: 6000
      },
      {
        label: '12k',
        value: 0,
        frequency: 12000
      },
      {
        label: '14k',
        value: 0,
        frequency: 14000
      },
      {
        type: 'highpass',
        label: '16k',
        value: 0,
        frequency: 16000
      }
    ]
  }

  state: EqualizerState = {
    connectedBands: null
  }

  componentDidMount () {
    this.props.onAudioMounted(() => {
      this.setup()
    })
  }

  setup () {
    let connectedBands: ConnectedBand[] = this.props.bands
      .map((band, i) => {
        const currentBand = this.props.createBiquadFilter()

        if (band.type) {
          currentBand.type = band.type
        } else {
          // currentBand.type = 'bandpass'
        }
        if (band.frequency) currentBand.frequency.value = band.frequency
        currentBand.gain.value = this.props.gains[i]

        return currentBand
      })
      .map(band => {
        this.props.connectToSource(band)

        let invert: GainNode | undefined
        // if (index === 0 || index === this.props.bands.length - 1) {
        //   invert = this.props.createGain()
        //   invert.gain.value = -1.0
        //   band.connect(invert)
        // }

        const gainContext = this.props.createGain()
        band.connect(gainContext)

        return {
          band,
          invert,
          gainContext
        }
      })

    connectedBands = connectedBands
      .map((connectedBand, index) => {
        if (index === 0 && index < this.props.bands.length - 1) {
          connectedBand.gainContext.connect(connectedBands[index + 1].band)
        }

        if (index > 1 && index === this.props.bands.length - 1) {
          connectedBand.gainContext.connect(connectedBands[index - 1].band)
        }

        return connectedBand
      })

    const sum = this.props.createGain()
    connectedBands = connectedBands
      .map(connectedBand => {
        connectedBand.gainContext.connect(sum)
        return connectedBand
      })
    this.props.connectDestination(sum)
    this.setState({ connectedBands })
  }

  changeGain (inputValue: string, index: number) {
    this.setState(({ connectedBands }) => {
      const nextBands = (connectedBands ?? []).slice()
      const connectedBand = nextBands[index]
      connectedBand.gainContext.gain.value = parseFloat(inputValue) / 100.0
      return { connectedBands: nextBands }
    })
  }

  render () {
    const { connectedBands } = this.state
    return (
      <div className={style.equalizer}>
        <div className={style.header}>
          Equalizer
        </div>
        <div className={style.sliders}>
          {connectedBands && connectedBands.map((connectedBand, index) => (
            <div className={style.slider} key={index}>
              <div className={style.input}>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={connectedBand.gainContext.gain.value * 100}
                  orientation={'vertical'}
                  onInput={e => { this.changeGain(e.currentTarget.value, index) }}
                />
              </div>
              <div className={style.band}>
                {this.props.bands[index].label}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
}

export default Equalizer
