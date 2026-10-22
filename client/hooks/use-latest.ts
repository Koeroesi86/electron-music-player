import { useRef } from 'react';

/** A ref that always holds the value of the latest render, for callbacks that are registered once */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
