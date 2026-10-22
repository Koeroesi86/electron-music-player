import { useEffect, useState } from 'react';

/** Follows the value after a delay, so content can stay in place while a transition plays out */
export function useDelayedValue<T>(value: T, delay: number) {
  const [delayed, setDelayed] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDelayed(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return delayed;
}
