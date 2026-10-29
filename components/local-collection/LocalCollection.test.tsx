import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { LibraryView } from '../../client/redux/types';
import LocalCollection from './LocalCollection';

vi.mock('../album-view', () => ({ default: () => null }));
vi.mock('../group-view', () => ({ default: () => null }));
vi.mock('../track-view', () => ({ default: () => null }));
vi.mock('../folder-management', () => ({ default: () => null }));
vi.mock('../folder-filter', () => ({ default: () => <button>folders</button> }));
vi.mock('../library-search', () => ({ default: () => <input aria-label="search" /> }));
vi.mock('../album-sort', () => ({ default: () => <button>album sort</button> }));

const renderPage = (view: LibraryView, props: Partial<Parameters<typeof LocalCollection>[0]> = {}) =>
  render(<LocalCollection view={view} scanningFolder={null} setView={vi.fn()} rescanLibrary={vi.fn()} addFiles={vi.fn()} {...props} />);

describe('LocalCollection', () => {
  afterEach(cleanup);

  it('puts the search, the folders, the sort of the albums and the rescan in one row, without a title', () => {
    renderPage('albums');

    expect(screen.getByRole('textbox', { name: 'search' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'folders' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'album sort' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rescan' })).toBeTruthy();
    expect(screen.queryByText('Albums')).toBeNull();
  });

  it('leaves the sort of the albums to the other views, which sort in their own bar', () => {
    renderPage('artists');

    expect(screen.queryByRole('button', { name: 'album sort' })).toBeNull();
  });

  it('has no search or folders on the page of the folders', () => {
    renderPage('folders');

    expect(screen.queryByRole('textbox', { name: 'search' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'folders' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Rescan' })).toBeTruthy();
  });

  it('rescans from the button, which waits while a folder is scanned', () => {
    const rescanLibrary = vi.fn();
    const { rerender } = renderPage('albums', { rescanLibrary });

    fireEvent.click(screen.getByRole('button', { name: 'Rescan' }));
    expect(rescanLibrary).toHaveBeenCalledTimes(1);

    rerender(<LocalCollection view="albums" scanningFolder="/music" setView={vi.fn()} rescanLibrary={rescanLibrary} addFiles={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Rescan' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
