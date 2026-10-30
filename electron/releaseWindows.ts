import type { AppWindows } from '../types/global';

/**
 * The main window is gone: the splash that waits for it goes with it, or it stays as the only window and the app never quits (the main window is
 * closed, or its page crashes, before it is shown). The splash may be gone already, closed by itself.
 */
const releaseWindows = (windows: AppWindows) => {
  if (windows.loading && !windows.loading.isDestroyed()) windows.loading.close();
  windows.main = null;
  windows.loading = null;
};

export default releaseWindows;
