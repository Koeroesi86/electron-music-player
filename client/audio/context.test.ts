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

    expect(audio.createAnalyser()).toBeUndefined();
  });

  it('only listens with the analyser: playing its output would add the signal around the equalizer', async () => {
    const { audio, source, analysers } = await setup();
    audio.connectNode(document.createElement('audio'));

    const analyser = audio.createAnalyser();

    expect(source.connect).toHaveBeenCalledWith(analyser);
    expect(analysers[0].connect).not.toHaveBeenCalled();
  });

  it.each([
    { ended: false, notified: [false] },
    { ended: true, notified: [] },
  ])('reports a pause as a stop of playing only when the track has not ended ($ended)', async ({ ended, notified }) => {
    const { audio } = await setup();
    const node = document.createElement('audio');
    Object.defineProperty(node, 'ended', { value: ended });
    const listener = vi.fn();
    audio.addPlayStatusListener(listener);
    audio.connectNode(node);

    node.dispatchEvent(new Event('pause'));

    expect(listener.mock.calls.map(([playing]) => playing)).toEqual(notified);
  });

  describe('play', () => {
    const connectPlayable = async (play: () => Promise<void>, paused = true) => {
      const { audio } = await setup();
      const node = document.createElement('audio');
      Object.defineProperty(node, 'paused', { value: paused });
      node.play = vi.fn(play);
      audio.connectNode(node);
      return { audio, node };
    };

    it('starts a paused element', async () => {
      const { audio, node } = await connectPlayable(() => Promise.resolve());

      audio.play();

      expect(node.play).toHaveBeenCalledTimes(1);
    });

    it('does not ask an element that plays or starts again', async () => {
      const { audio, node } = await connectPlayable(() => Promise.resolve(), false);

      audio.play();

      expect(node.play).not.toHaveBeenCalled();
    });

    it('does not report a play that was interrupted as an error', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { audio } = await connectPlayable(() => Promise.reject(new DOMException('interrupted by a new load request', 'AbortError')));

      audio.play();
      await vi.advanceTimersByTimeAsync(0);

      expect(error).not.toHaveBeenCalled();
    });

    it('reports a play that failed', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const failure = new DOMException('not allowed', 'NotAllowedError');
      const { audio } = await connectPlayable(() => Promise.reject(failure));

      audio.play();
      await vi.advanceTimersByTimeAsync(0);

      expect(error).toHaveBeenCalledWith(failure);
    });
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
