import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import LauncherIntegration from './LauncherIntegration';

describe('LauncherIntegration', () => {
  afterEach(cleanup);

  it('shows nothing where the app can not add itself to the menu', () => {
    const { container } = render(<LauncherIntegration available={false} enabled={false} setEnabled={vi.fn()} />);

    expect(container.innerHTML).toBe('');
  });

  it('shows the app is not in the menu, and asks to add it', () => {
    const setEnabled = vi.fn();
    render(<LauncherIntegration available enabled={false} setEnabled={setEnabled} />);

    expect(screen.getByRole('switch', { name: 'Application menu' }).getAttribute('aria-checked')).toBe('false');
    fireEvent.click(screen.getByRole('switch', { name: 'Application menu' }));

    expect(setEnabled).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('asks to remove the app from the menu once it was added', () => {
    const setEnabled = vi.fn();
    render(<LauncherIntegration available enabled setEnabled={setEnabled} />);

    fireEvent.click(screen.getByRole('switch', { name: 'Application menu' }));

    expect(setEnabled).toHaveBeenCalledExactlyOnceWith(false);
  });
});
