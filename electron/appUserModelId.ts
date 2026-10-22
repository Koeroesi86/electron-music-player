/** The `build.appId` of package.json, which is not in the packaged copy of it (appUserModelId.test.ts keeps the two equal) */
export const installerAppId = 'io.github.koeroesi86.eMusic';

/** The installed app uses the ID its NSIS shortcuts are created with, so notifications and taskbar pins group with them; a development run gets its own */
export const getAppUserModelId = (isDev: boolean, nodeEnv: string | undefined) => (isDev ? `${installerAppId}-${nodeEnv}` : installerAppId);
