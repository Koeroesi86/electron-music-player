import type { BrowserWindowConstructorOptions } from 'electron';

/** The preload script tells the page about it (`electronAPI.nativeControls`) through this argument */
export const nativeControlsArgument = '--native-window-controls';

/** macOS draws its traffic lights over the sidebar; elsewhere the page draws the buttons (components/window-controls) */
export const hasNativeControls = (platform: NodeJS.Platform) => platform === 'darwin';

export const getControlsArguments = (platform: NodeJS.Platform) => (hasNativeControls(platform) ? [nativeControlsArgument] : []);

/** The window has no frame of its own; on macOS the traffic lights stay, vertically centred in the 56px bar of the sidebar */
export const getFrameOptions = (platform: NodeJS.Platform): BrowserWindowConstructorOptions =>
  hasNativeControls(platform) ? { titleBarStyle: 'hidden', trafficLightPosition: { x: 20, y: 22 } } : { frame: false };
