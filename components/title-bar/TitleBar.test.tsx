import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import TitleBar from './TitleBar';

describe('TitleBar', () => {
  afterEach(cleanup);

  it('shows the icon of the app before the title', () => {
    const { container } = render(<TitleBar title="eMusic" />);

    expect(screen.getByText('eMusic').querySelector('img')?.getAttribute('src')).toContain('svg');
    expect(container.querySelectorAll('img')).toHaveLength(1);
  });

  it('closes from the first button', () => {
    const close = vi.fn();
    const { container } = render(<TitleBar close={close} />);

    fireEvent.click(container.querySelectorAll('span')[0]);

    expect(close).toHaveBeenCalledOnce();
  });
});
