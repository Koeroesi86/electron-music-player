import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import LauncherIntegration from './LauncherIntegration';

describe('LauncherIntegration', () => {
  afterEach(cleanup);

  it('shows nothing where the app can not add itself to the menu', () => {
    const { container } = render(<LauncherIntegration available={false} enabled={false} setEnabled={vi.fn()} />);

    expect(container.innerHTML).toBe('');
  });

  it('offers to add the app to the menu and asks for it', () => {
    const setEnabled = vi.fn();
    render(<LauncherIntegration available enabled={false} setEnabled={setEnabled} />);

    fireEvent.click(screen.getByText('Add to application menu'));

    expect(setEnabled).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('offers to remove the app from the menu once it was added', () => {
    const setEnabled = vi.fn();
    render(<LauncherIntegration available enabled setEnabled={setEnabled} />);

    fireEvent.click(screen.getByText('Remove from application menu'));

    expect(setEnabled).toHaveBeenCalledExactlyOnceWith(false);
  });
});
