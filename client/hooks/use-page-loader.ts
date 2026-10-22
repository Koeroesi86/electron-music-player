import { useEffect } from 'react';
import { pagesToLoad } from '../redux/library/pages';
import type { PageCache } from '../redux/library/pages';

/** Request the pages of the cache that the items from start to end (exclusive) need and that are missing or stale */
export const usePageLoader = <T>(cache: PageCache<T>, start: number, end: number, loadPage: (page: number) => void) => {
  useEffect(() => {
    pagesToLoad(cache, start, end).forEach((page) => loadPage(page));
  }, [cache, start, end, loadPage]);
};
