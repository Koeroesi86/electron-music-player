import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import WindowBlur from './WindowBlur';

describe('WindowBlur', () => {
  afterEach(cleanup);

  it('shows nothing where the app blurs the window itself', () => {
    const { container } = render(<WindowBlur available={false} enabled={false} toggle={vi.fn()} />);

    expect(container.innerHTML).toBe('');
  });

  it('offers translucent panels and asks for them', () => {
    const toggle = vi.fn();
    render(<WindowBlur available enabled={false} toggle={toggle} />);

    fireEvent.click(screen.getByText('Use translucent panels'));

    expect(toggle).toHaveBeenCalledOnce();
  });

  it('offers to go back to opaque panels once they are translucent', () => {
    render(<WindowBlur available enabled toggle={vi.fn()} />);

    expect(screen.getByText('Use opaque panels')).toBeTruthy();
  });
});
