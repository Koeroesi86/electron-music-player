import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { AlbumSummary } from '../../types/library';
import { createPageCache, storePage } from '../../client/redux/library/pages';
import AlbumView from './AlbumView';

vi.mock('../album-sort', () => ({ default: () => null }));
vi.mock('../album-view-thumbnail', () => ({ default: () => null }));

const album = (index: number): AlbumSummary => ({
  id: `/music/${index} - Album`,
  title: 'Album',
  path: `/music/${index}`,
  artist: 'Artist',
  cover: null,
  duration: 60,
  year: 2020,
  trackCount: 1,
});

describe('AlbumView', () => {
  afterEach(cleanup);

  it('tells how many albums the whole list has', () => {
    const albums = storePage(createPageCache<AlbumSummary>(), 0, [album(1), album(2)], 420);

    render(<AlbumView albums={albums} sort={undefined} selected={[]} folders={[]} playTracks={vi.fn()} selectAlbum={vi.fn()} loadPage={vi.fn()} />);

    expect(screen.getByText('420 albums')).toBeTruthy();
  });
});
