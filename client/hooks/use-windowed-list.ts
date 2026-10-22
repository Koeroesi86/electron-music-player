import { useEffect, useRef, useState } from 'react';

interface WindowParams {
  scrollTop: number;
  viewportHeight: number;
  rowHeight: number;
  rowCount: number;
  overscan: number;
}

/** The rows from first to last (exclusive) to render: the visible ones and some more on both sides */
export const getRowWindow = ({ scrollTop, viewportHeight, rowHeight, rowCount, overscan }: WindowParams) => ({
  first: Math.max(Math.floor(scrollTop / rowHeight) - overscan, 0),
  last: Math.min(Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan, rowCount),
});

interface Viewport {
  scrollTop: number;
  height: number;
  width: number;
}

const initialViewport: Viewport = { scrollTop: 0, height: 600, width: 800 };

interface WindowedListOptions {
  itemCount: number;
  rowHeight: number;
  /** The width of an item, items are laid out in as many columns as fit; one column when omitted */
  itemWidth?: number;
  overscan?: number;
}

/** Render only the rows in view of a scrolling element: the rows are put in a box that is as high as the whole list, below an offset */
export const useWindowedList = ({ itemCount, rowHeight, itemWidth, overscan = 4 }: WindowedListOptions) => {
  const listing = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState(initialViewport);

  useEffect(() => {
    const element = listing.current;
    if (!element) return undefined;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const { paddingLeft, paddingRight } = getComputedStyle(element);
      const next = {
        // the rows are measured at the granularity of a row, so a scroll inside a row does not render again
        scrollTop: Math.floor(element.scrollTop / rowHeight) * rowHeight,
        height: element.clientHeight,
        width: element.clientWidth - (parseFloat(paddingLeft) || 0) - (parseFloat(paddingRight) || 0),
      };
      setViewport((current) => (current.scrollTop === next.scrollTop && current.height === next.height && current.width === next.width ? current : next));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);

    measure();
    element.addEventListener('scroll', schedule, { passive: true });
    observer?.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener('scroll', schedule);
      observer?.disconnect();
    };
  }, [rowHeight]);

  const columns = itemWidth ? Math.max(Math.floor(viewport.width / itemWidth), 1) : 1;
  const rowCount = Math.ceil(itemCount / columns);
  const { first, last } = getRowWindow({ scrollTop: viewport.scrollTop, viewportHeight: viewport.height, rowHeight, rowCount, overscan });

  return {
    listing,
    columns,
    firstRow: first,
    lastRow: last,
    firstIndex: first * columns,
    lastIndex: Math.min(last * columns, itemCount),
    offsetTop: first * rowHeight,
    height: rowCount * rowHeight,
  };
};
