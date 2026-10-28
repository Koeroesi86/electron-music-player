import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ArtistPhotos from './ArtistPhotos';

describe('ArtistPhotos', () => {
  afterEach(cleanup);

  it('says that the names of the artists are sent to Deezer, and offers to turn it off', () => {
    const setEnabled = vi.fn();
    render(<ArtistPhotos enabled setEnabled={setEnabled} />);

    expect(screen.getByText(/names of the artists in your library are sent to Deezer/)).toBeTruthy();
    fireEvent.click(screen.getByText('Turn off'));
    expect(setEnabled).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('says that nothing is sent while it is off, and offers to turn it on', () => {
    const setEnabled = vi.fn();
    render(<ArtistPhotos enabled={false} setEnabled={setEnabled} />);

    expect(screen.getByText(/not sent anywhere/)).toBeTruthy();
    fireEvent.click(screen.getByText('Turn on'));
    expect(setEnabled).toHaveBeenCalledExactlyOnceWith(true);
  });
});
