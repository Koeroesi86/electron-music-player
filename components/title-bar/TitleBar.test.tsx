import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import TitleBar from './TitleBar';

describe('TitleBar', () => {
  afterEach(cleanup);

  it('shows the icon of the app before the title', () => {
    const { container } = render(<TitleBar title="eMusic" />);

    expect(screen.getByText('eMusic').querySelector('img')?.getAttribute('src')).toContain('svg');
    expect(container.querySelectorAll('img')).toHaveLength(1);
  });

  it('has no buttons of its own', () => {
    render(<TitleBar />);

    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('leaves room for the traffic lights only where the window has them', () => {
    const { container, rerender } = render(<TitleBar />);
    const children = () => container.firstElementChild?.children.length;

    expect(children()).toBe(1);

    rerender(<TitleBar nativeControls />);

    expect(children()).toBe(2);
  });
});
