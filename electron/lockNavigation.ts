import type { WebContents } from 'electron';

/** Keep a window on the origin it was loaded from, and refuse to open further windows */
function lockNavigation(webContents: WebContents) {
  webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== new URL(webContents.getURL()).origin) event.preventDefault();
  });
}

export default lockNavigation;
