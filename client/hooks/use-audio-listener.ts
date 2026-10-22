import { useEffect } from 'react';
import { useLatest } from './use-latest';

/** Register a listener with the audio context once, it always calls the callback of the latest render */
export function useAudioListener<T>(register: (listener: (value: T) => void) => void, callback: (value: T) => void) {
  const latest = useLatest(callback);

  useEffect(() => {
    register((value) => latest.current(value));
    // the audio context only adds listeners, so this registers once
  }, []);
}
