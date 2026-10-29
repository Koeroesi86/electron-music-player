import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ViewSwitcher from './ViewSwitcher';

const views = [
  { view: 'one', label: 'First', panel: <span>first panel</span> },
  { view: 'two', label: 'Second', panel: <span>second panel</span> },
];

describe('ViewSwitcher', () => {
  afterEach(cleanup);

  it('shows a tab for each view and switches on click', () => {
    const setView = vi.fn();
    render(<ViewSwitcher views={views} current="one" setView={setView} />);

    fireEvent.click(screen.getByText('Second'));

    expect(screen.getByText('First')).toBeTruthy();
    expect(setView).toHaveBeenCalledWith('two');
  });

  it('shows the controls only when the tabs are off, since the sidebar picks the view and names it', () => {
    const setView = vi.fn();
    render(<ViewSwitcher views={views} current="two" setView={setView} tabs={false} controls={<button>Rescan</button>} />);

    expect(screen.queryByText('First')).toBeNull();
    expect(screen.queryByText('Second')).toBeNull();
    expect(screen.getByRole('button', { name: 'Rescan' })).toBeTruthy();
    expect(setView).not.toHaveBeenCalled();
  });
});
