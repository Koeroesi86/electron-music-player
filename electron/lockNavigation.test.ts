import { describe, expect, it, vi } from 'vitest';
import type { WebContents } from 'electron';
import lockNavigation from './lockNavigation';

describe('lockNavigation', () => {
  const setup = (currentUrl: string) => {
    const handlers: Record<string, (event: { preventDefault: () => void }, url: string) => void> = {};
    const setWindowOpenHandler = vi.fn();
    const webContents = {
      getURL: () => currentUrl,
      setWindowOpenHandler,
      on: (name: string, handler: (event: { preventDefault: () => void }, url: string) => void) => {
        handlers[name] = handler;
      },
    } as unknown as WebContents;
    lockNavigation(webContents);
    const navigate = (url: string) => {
      const preventDefault = vi.fn();
      handlers['will-navigate']({ preventDefault }, url);
      return preventDefault;
    };
    return { navigate, setWindowOpenHandler };
  };

  it('refuses to leave the origin of the app', () => {
    const { navigate } = setup('http://127.0.0.1:3000/app/index.html?port=3000');

    expect(navigate('https://example.com/')).toHaveBeenCalled();
    expect(navigate('http://127.0.0.1:3001/')).toHaveBeenCalled();
    expect(navigate('file:///etc/passwd')).toHaveBeenCalled();
  });

  it('allows navigation within the origin', () => {
    const { navigate } = setup('http://127.0.0.1:3000/app/index.html?port=3000');

    expect(navigate('http://127.0.0.1:3000/app/index.html')).not.toHaveBeenCalled();
  });

  it('denies new windows', () => {
    const { setWindowOpenHandler } = setup('http://127.0.0.1:3000/');

    expect(setWindowOpenHandler.mock.calls[0][0]()).toEqual({ action: 'deny' });
  });
});
