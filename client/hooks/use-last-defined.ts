import { useRef } from 'react';

/** Keeps the last value that was set, so content can stay in place while a transition plays out after the value is cleared */
export function useLastDefined<T>(value: T | null | undefined) {
  const last = useRef(value);
  last.current = value ?? last.current;
  return last.current;
}
