import type { BrowserWindow } from 'electron';

/** What shows blurred behind the translucent parts of a window: macOS vibrancy, a blur the desktop adds (EMUSIC_BLUR=1), or nothing */
export type WindowBackdrop = 'vibrancy' | 'external' | 'none';

/** The preload script tells the page about it (`electronAPI.blurred`) through this argument */
export const blurArgument = '--window-blur';

/**
 * Electron can only blur behind a window on macOS. Elsewhere the desktop has to do it (the Blur my Shell extension on GNOME, KDE's
 * blur rule), which the app cannot detect, so EMUSIC_BLUR=1 says it does
 */
export const getWindowBackdrop = (platform: NodeJS.Platform, env: NodeJS.ProcessEnv): WindowBackdrop => {
  if (platform === 'darwin') return 'vibrancy';
  return env.EMUSIC_BLUR === '1' ? 'external' : 'none';
};

export const getBackdropArguments = (backdrop: WindowBackdrop) => (backdrop === 'none' ? [] : [blurArgument]);

export const applyWindowBackdrop = (window: BrowserWindow, backdrop: WindowBackdrop) => {
  if (backdrop === 'vibrancy') window.setVibrancy('under-window');
};
