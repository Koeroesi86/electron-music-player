import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import Equalizer from './Equalizer';
import { defaultGains, equalizerBands } from '../../client/audio/equalizer';

const createFilter = () => {
  const filter = {
    type: 'lowpass',
    frequency: { value: 0 },
    gain: { value: 0 },
    connect: vi.fn(),
  };
  return filter as typeof filter & BiquadFilterNode;
};

const setup = (gains = defaultGains) => {
  const filters: ReturnType<typeof createFilter>[] = [];
  let mounted = () => {};
  const props = {
    gains,
    createBiquadFilter: () => {
      const filter = createFilter();
      filters.push(filter);
      return filter;
    },
    connectToSource: vi.fn(),
    connectDestination: vi.fn(),
    onAudioMounted: (listener: () => void) => {
      mounted = listener;
    },
    setGain: vi.fn(),
  };
  const view = render(<Equalizer {...props} />);
  return { props, filters, view, mount: () => mounted() };
};

describe('Equalizer', () => {
  afterEach(cleanup);

  it('chains the filters in series from the source to the destination', () => {
    const { props, filters, mount } = setup();
    mount();

    expect(filters).toHaveLength(equalizerBands.length);
    filters.slice(0, -1).forEach((filter, index) => expect(filter.connect).toHaveBeenCalledExactlyOnceWith(filters[index + 1]));
    expect(props.connectToSource).toHaveBeenCalledExactlyOnceWith(filters[0]);
    expect(props.connectDestination).toHaveBeenCalledExactlyOnceWith(filters[filters.length - 1]);
    expect(filters.map((filter) => filter.type)).toEqual(['lowshelf', ...Array(8).fill('peaking'), 'highshelf']);
  });

  it('builds the chain once however often the audio is mounted', () => {
    const { filters, mount } = setup();
    mount();
    mount();

    expect(filters).toHaveLength(equalizerBands.length);
  });

  it('applies the gains and follows changes', () => {
    const gains = defaultGains.map((_, index) => index);
    const { filters, view, mount, props } = setup(gains);
    mount();
    expect(filters.map((filter) => filter.gain.value)).toEqual(gains);

    view.rerender(<Equalizer {...props} gains={gains.map((gain) => gain + 1)} />);
    expect(filters.map((filter) => filter.gain.value)).toEqual(gains.map((gain) => gain + 1));
  });

  it('reports a slider change with its band', () => {
    const { props, view } = setup();

    fireEvent.input(view.container.querySelectorAll('input[type="range"]')[3], { target: { value: '4' } });

    expect(props.setGain).toHaveBeenCalledWith(3, '4');
  });
});
