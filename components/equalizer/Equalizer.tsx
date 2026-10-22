import { useEffect, useRef } from 'react';
import style from './Equalizer.scss';
import Slider from '../slider/Slider';
import { useLatest } from '../../client/hooks/use-latest';
import { bandType, equalizerBands, maxGain, minGain } from '../../client/audio/equalizer';

interface EqualizerProps {
  gains: number[];
  createBiquadFilter: () => BiquadFilterNode;
  connectDestination: (node: AudioNode) => void;
  connectToSource: (node: AudioNode) => void;
  onAudioMounted: (listener: () => void) => void;
  setGain: (index: number, value: number | string) => void;
}

const Equalizer = ({ gains, createBiquadFilter, connectDestination, connectToSource, onAudioMounted, setGain }: EqualizerProps) => {
  const filters = useRef<BiquadFilterNode[]>([]);
  const latestGains = useLatest(gains);

  const applyGains = () =>
    filters.current.forEach((filter, index) => {
      filter.gain.value = latestGains.current[index] ?? 0;
    });

  const setup = () => {
    if (filters.current.length > 0) return;

    filters.current = equalizerBands.map(({ frequency }, index) => {
      const filter = createBiquadFilter();
      filter.type = bandType(index);
      filter.frequency.value = frequency;
      return filter;
    });
    filters.current.slice(1).forEach((filter, index) => filters.current[index].connect(filter));

    applyGains();
    connectToSource(filters.current[0]);
    connectDestination(filters.current[filters.current.length - 1]);
  };

  useEffect(() => {
    onAudioMounted(setup);
    // the audio context only adds listeners, so this registers once
  }, []);

  useEffect(applyGains, [gains]);

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
                onInput={(e) => setGain(index, e.currentTarget.value)}
              />
            </div>
            <div className={style.band}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Equalizer;
