import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import GroupTile from './GroupTile';

const group = { key: 'adam', name: 'Adam', albumCount: 1, trackCount: 12, cover: null };

describe('GroupTile', () => {
  afterEach(cleanup);

  it('shows the name with the number of albums and tracks, and opens the group when it is clicked', () => {
    const open = vi.fn();
    render(<GroupTile group={group} unknownName="Unknown artist" open={open} />);

    expect(screen.getByText('1 album · 12 tracks')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Adam/ }));
    expect(open).toHaveBeenCalledWith(group);
  });

  it('calls a group without a name by the unknown name', () => {
    render(<GroupTile group={{ ...group, key: '', name: '' }} unknownName="Unknown artist" open={vi.fn()} />);

    expect(screen.getByText('Unknown artist')).toBeTruthy();
  });

  it('shows the photo of a group as the picture and as the glow behind it', () => {
    const { container } = render(<GroupTile group={{ ...group, cover: '/albumart/adam.jpg' }} unknownName="Unknown artist" open={vi.fn()} />);

    expect(container.querySelectorAll('[style*="adam-optimized.png"]')).toHaveLength(2);
  });

  it('shows the placeholder, without a glow, for a group with no picture', () => {
    const { container } = render(<GroupTile group={group} unknownName="Unknown artist" open={vi.fn()} />);

    expect(container.querySelectorAll('[style*="background-image"]')).toHaveLength(0);
  });
});
