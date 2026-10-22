/** The installed app uses the ID its NSIS shortcuts are created with, so notifications and taskbar pins group with them; a development run gets its own */
export const getAppUserModelId = (appId: string, isDev: boolean, nodeEnv: string | undefined) => (isDev ? `${appId}-${nodeEnv}` : appId);
