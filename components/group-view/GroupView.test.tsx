import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import type { GroupSummary } from '../../types/library';
import { createPageCache, storePage } from '../../client/redux/library/pages';
import GroupView from './GroupView';

vi.mock('../group-sort', () => ({ default: () => <div>group sort</div> }));
vi.mock('../group-tile', () => ({
  default: ({ group, unknownName, open }: { group: GroupSummary; unknownName: string; open: (group: GroupSummary) => void }) => (
    <button onClick={() => open(group)}>{`tile ${group.name || unknownName}`}</button>
  ),
}));
vi.mock('../album-sort', () => ({ default: () => <div>album sort</div> }));
vi.mock('../group-albums', () => ({ default: ({ toolbar }: { toolbar: ReactNode }) => <div>{toolbar}group albums</div> }));

const group = (key: string, name: string, albumCount = 1, trackCount = 2): GroupSummary => ({ key, name, albumCount, trackCount, cover: null });

const renderView = (props: Partial<ComponentProps<typeof GroupView>> = {}) => {
  const handlers = { loadPage: vi.fn(), setSort: vi.fn(), setFilter: vi.fn(), openGroup: vi.fn(), closeGroup: vi.fn() };
  const groups = storePage(createPageCache<GroupSummary>(), 0, [group('adam', 'Adam', 3, 12), group('', '')], 2);

  render(<GroupView kind="genre" groups={groups} sort={undefined} filter="" selected={[]} folders={[]} open={undefined} {...handlers} {...props} />);
  return handlers;
};

describe('GroupView', () => {
  afterEach(cleanup);

  it('lists the names with their albums and tracks, and the ones without a name as unknown', () => {
    renderView();

    expect(screen.getByText('Adam')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('Unknown genre')).toBeTruthy();
    expect(screen.getByText('2 genres')).toBeTruthy();
    expect(screen.queryByText('group sort')).toBeNull();
  });

  it('shows the artists and the album artists as tiles with the sort above, instead of the columns', () => {
    renderView({ kind: 'albumArtist', groups: storePage(createPageCache<GroupSummary>(), 0, [group('adam', 'Adam'), group('', '')], 2) });

    expect(screen.getByText('tile Adam')).toBeTruthy();
    expect(screen.getByText('tile Unknown album artist')).toBeTruthy();
    expect(screen.getByText('2 album artists')).toBeTruthy();
    expect(screen.getByText('group sort')).toBeTruthy();
    expect(screen.queryByRole('columnheader')).toBeNull();
  });

  it('opens the group of a tile', () => {
    const { openGroup } = renderView({ kind: 'artist' });

    fireEvent.click(screen.getByText('tile Adam'));

    expect(openGroup).toHaveBeenCalledWith({ kind: 'artist', key: 'adam', name: 'Adam' });
  });

  it('opens the group of a row, with the key the library compares by', () => {
    const { openGroup } = renderView();

    fireEvent.click(screen.getByText('Adam'));

    expect(openGroup).toHaveBeenCalledWith({ kind: 'genre', key: 'adam', name: 'Adam' });
  });

  it('sorts by a column, then the other way, then back to the default order', () => {
    const { setSort } = renderView({ sort: { field: 'trackCount', direction: 'asc' } });

    fireEvent.click(screen.getByRole('button', { name: 'Albums' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tracks' }));

    expect(setSort).toHaveBeenNthCalledWith(1, { field: 'albumCount', direction: 'asc' });
    expect(setSort).toHaveBeenNthCalledWith(2, { field: 'trackCount', direction: 'desc' });
    expect(screen.getByRole('columnheader', { name: 'Tracks' }).getAttribute('aria-sort')).toBe('ascending');
    expect(screen.getByRole('columnheader', { name: 'Name' }).getAttribute('aria-sort')).toBe('none');
  });

  it('filters after the typing pauses, not at every key', async () => {
    const { setFilter } = renderView();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter by name' }), { target: { value: 'b' } });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter by name' }), { target: { value: 'bj' } });

    expect(setFilter).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(setFilter).toHaveBeenCalledWith('bj'));
    expect(setFilter).toHaveBeenCalledTimes(1);
  });

  it('asks for the pages it shows', () => {
    const { loadPage } = renderView({ groups: createPageCache<GroupSummary>() });

    expect(loadPage).toHaveBeenCalledWith(0);
  });

  it('shows the albums of the open group with its name and a way back', () => {
    const { closeGroup } = renderView({ kind: 'genre', open: { kind: 'genre', key: '', name: '' } });

    expect(screen.getByText('group albums')).toBeTruthy();
    expect(screen.getByText('Unknown genre')).toBeTruthy();
    expect(screen.queryByRole('searchbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(closeGroup).toHaveBeenCalled();
  });
});
