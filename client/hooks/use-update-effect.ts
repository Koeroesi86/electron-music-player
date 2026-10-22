import { useEffect, useRef } from 'react';
import type { DependencyList, EffectCallback } from 'react';

/** Like `useEffect`, but it skips the first render and only reacts to changes */
export const useUpdateEffect = (effect: EffectCallback, deps: DependencyList) => {
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return undefined;
    }
    return effect();
  }, deps);
};
