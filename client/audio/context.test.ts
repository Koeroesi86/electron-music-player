import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useContext } from 'react';
import { renderHook } from '@testing-library/react';

const fakeNode = () => ({ connect: vi.fn(), disconnect: vi.fn() });

/** A fresh module on a fake AudioContext, which records how the nodes are wired */
const setup = async () => {
  vi.resetModules();
  const source = fakeNode();
  const analysers: ReturnType<typeof fakeNode>[] = [];
  const createMediaElementSource = vi.fn(() => source);
  vi.stubGlobal(
    'AudioContext',
    class {
      destination = {};
      createMediaElementSource = createMediaElementSource;
      createAnalyser = () => {
        const analyser = Object.assign(fakeNode(), { smoothingTimeConstant: 0, fftSize: 0 });
        analysers.push(analyser);
        return analyser;
      };
    }
  );
  const { Audio } = await import('./context');
  const { result } = renderHook(() => useContext(Audio));
  return { audio: result.current, source, analysers, createMediaElementSource };
};

describe('audio context', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('has no analyser before an audio element is connected', async () => {
    const { audio } = await setup();

    expect(audio.createAnalyser()).toBe(false);
  });

  it('only listens with the analyser: playing its output would add the signal around the equalizer', async () => {
    const { audio, source, analysers } = await setup();
    audio.connectNode(document.createElement('audio'));

    const analyser = audio.createAnalyser();

    expect(source.connect).toHaveBeenCalledWith(analyser);
    expect(analysers[0].connect).not.toHaveBeenCalled();
  });

  it('shares one analyser however often it is asked for', async () => {
    const { audio, analysers } = await setup();
    audio.connectNode(document.createElement('audio'));

    expect(audio.createAnalyser()).toBe(audio.createAnalyser());
    expect(analysers).toHaveLength(1);
  });

  it('wraps an audio element once, however often it is connected', async () => {
    const { audio, createMediaElementSource } = await setup();
    const element = document.createElement('audio');

    audio.connectNode(element);
    audio.connectNode(null);
    audio.connectNode(element);

    expect(createMediaElementSource).toHaveBeenCalledTimes(1);
  });
});
