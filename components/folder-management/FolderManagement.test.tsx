import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import FolderManagement from './FolderManagement';

const folders = [{ path: '/music/a', lastModified: 1 }];

describe('FolderManagement', () => {
  afterEach(cleanup);

  it('removes a folder only after it is confirmed', () => {
    const removeFolder = vi.fn();
    render(<FolderManagement folders={folders} addFiles={() => {}} removeFolder={removeFolder} />);

    fireEvent.click(screen.getByText('Remove'));
    expect(removeFolder).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Remove from library'));
    expect(removeFolder).toHaveBeenCalledWith('/music/a');
  });

  it('keeps the folder when the removal is declined', () => {
    const removeFolder = vi.fn();
    render(<FolderManagement folders={folders} addFiles={() => {}} removeFolder={removeFolder} />);

    fireEvent.click(screen.getByText('Remove'));
    fireEvent.click(screen.getByText('Keep'));

    expect(removeFolder).not.toHaveBeenCalled();
  });
});
