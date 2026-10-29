import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import CoverSizeSlider from './CoverSizeSlider';

describe('CoverSizeSlider', () => {
  afterEach(cleanup);

  it('shows the width and sets the size it is moved to', () => {
    const setSize = vi.fn();
    render(<CoverSizeSlider size={180} setSize={setSize} />);

    const slider = screen.getByRole<HTMLInputElement>('slider', { name: 'Cover size' });
    expect(slider.value).toBe('180');
    expect(screen.getByText('180 px')).toBeTruthy();
    fireEvent.change(slider, { target: { value: '220' } });
    expect(setSize).toHaveBeenCalledWith(220);
  });
});
