import { useEffect, useRef } from 'react';
import { debounce } from '../utils/debounce';

/** Toggle a class on the separator while the listing is scrolled down */
export const useScrollSeparator = (scrolledClassName: string) => {
  const separator = useRef<HTMLDivElement>(null);
  const listing = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = listing.current;
    const onScroll = debounce((event: Event) => {
      if (!(event.target instanceof HTMLElement)) return;
      separator.current?.classList.toggle(scrolledClassName, event.target.scrollTop > 0);
    }, 50);

    element?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      onScroll.cancel();
      element?.removeEventListener('scroll', onScroll);
    };
  }, [scrolledClassName]);

  return { separator, listing };
};
