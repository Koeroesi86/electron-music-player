import { PureComponent } from 'react';
import style from './Equalizer.scss';
import Slider from '../slider/Slider';
import { bandType, equalizerBands, maxGain, minGain } from '../../client/audio/equalizer';

interface EqualizerProps {
  gains: number[];
  createBiquadFilter: () => BiquadFilterNode;
  connectDestination: (node: AudioNode) => void;
  connectToSource: (node: AudioNode) => void;
  onAudioMounted: (listener: () => void) => void;
  setGain: (index: number, value: number | string) => void;
}

class Equalizer extends PureComponent<EqualizerProps> {
  private filters: BiquadFilterNode[] = [];

  componentDidMount() {
    this.props.onAudioMounted(() => {
      this.setup();
    });
  }

  componentDidUpdate(prevProps: EqualizerProps) {
    if (prevProps.gains !== this.props.gains) {
      this.applyGains();
    }
  }

  setup() {
    if (this.filters.length > 0) return;

    this.filters = equalizerBands.map(({ frequency }, index) => {
      const filter = this.props.createBiquadFilter();
      filter.type = bandType(index);
      filter.frequency.value = frequency;
      return filter;
    });

    this.filters.forEach((filter, index) => {
      const next = this.filters[index + 1];
      if (next) filter.connect(next);
    });

    this.applyGains();
    this.props.connectToSource(this.filters[0]);
    this.props.connectDestination(this.filters[this.filters.length - 1]);
  }

  applyGains() {
    this.filters.forEach((filter, index) => {
      filter.gain.value = this.props.gains[index] ?? 0;
    });
  }

  render() {
    const { gains, setGain } = this.props;
    return (
      <div className={style.equalizer}>
        <div className={style.header}>Equalizer</div>
        <div className={style.sliders}>
          {equalizerBands.map(({ label }, index) => (
            <div className={style.slider} key={label}>
              <div className={style.input}>
                <Slider
                  min={minGain}
                  max={maxGain}
                  step={0.5}
                  value={gains[index] ?? 0}
                  orientation={'vertical'}
                  onInput={(e) => {
                    setGain(index, e.currentTarget.value);
                  }}
                />
              </div>
              <div className={style.band}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export default Equalizer;
