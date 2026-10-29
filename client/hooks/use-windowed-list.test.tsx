import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { getRowWindow, useWindowedList } from './use-windowed-list';

describe('getRowWindow', () => {
  const params = { viewportHeight: 100, rowHeight: 20, rowCount: 1000, overscan: 2 };

  it('covers the visible rows and some more on both sides', () => {
    expect(getRowWindow({ ...params, scrollTop: 200 })).toEqual({ first: 8, last: 17 });
  });

  it('stays inside the list', () => {
    expect(getRowWindow({ ...params, scrollTop: 0 })).toEqual({ first: 0, last: 7 });
    expect(getRowWindow({ ...params, scrollTop: 19900, rowCount: 1000 })).toEqual({ first: 993, last: 1000 });
  });

  it('is empty for an empty list', () => {
    expect(getRowWindow({ ...params, scrollTop: 0, rowCount: 0 })).toEqual({ first: 0, last: 0 });
  });
});

describe('useWindowedList', () => {
  afterEach(cleanup);

  const Listing = ({
    itemCount,
    itemWidth,
    gap,
    rowHeight = 20,
  }: {
    itemCount: number;
    itemWidth?: number;
    gap?: number;
    rowHeight?: number | ((width: number) => number);
  }) => {
    const { listing, firstIndex, lastIndex, height, offsetTop, columns } = useWindowedList({ itemCount, rowHeight, itemWidth, gap, overscan: 1 });
    return (
      <div data-testid="listing" ref={listing}>
        <div data-testid="window" data-first={firstIndex} data-last={lastIndex} data-height={height} data-offset={offsetTop} data-columns={columns} />
      </div>
    );
  };

  const read = (getByTestId: (id: string) => HTMLElement) => ({ ...getByTestId('window').dataset });
  const scrollTo = (element: HTMLElement, scrollTop: number) =>
    act(async () => {
      element.scrollTop = scrollTop;
      fireEvent.scroll(element);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

  it('renders a bounded number of rows of a long list, in a box as high as the list', () => {
    const { getByTestId } = render(<Listing itemCount={50000} />);
    const { first, last, height } = read(getByTestId);

    expect(Number(last) - Number(first)).toBeLessThan(100);
    expect(height).toBe('1000000');
  });

  it('moves the window with the scroll position', async () => {
    const { getByTestId } = render(<Listing itemCount={50000} />);
    Object.defineProperty(getByTestId('listing'), 'clientHeight', { value: 100, configurable: true });

    await scrollTo(getByTestId('listing'), 20000);

    expect(read(getByTestId)).toMatchObject({ first: '999', offset: '19980' });
  });

  it('lays out items in as many columns as fit', () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: 350, configurable: true });
    const { getByTestId } = render(<Listing itemCount={100} itemWidth={100} />);
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;

    expect(read(getByTestId)).toMatchObject({ columns: '3', height: '680' });
  });

  it('counts the gaps between the columns, and sizes a row by the width a column ends up with', () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { value: 400, configurable: true });
    // 400 px hold two columns of at least 150 px and a gap of 20 (2 * 150 + 20), which grow to 190 px each; the row is the cover and 10 px
    const { getByTestId } = render(<Listing itemCount={10} itemWidth={150} gap={20} rowHeight={(width) => width + 10} />);
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;

    expect(read(getByTestId)).toMatchObject({ columns: '2', height: '1000' });
  });
});
