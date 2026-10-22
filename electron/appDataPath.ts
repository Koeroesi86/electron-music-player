import { resolve } from 'path';

// a dev run gets its own folder so it never touches the library of an installed app
const appDataPath = (appData: string, name: string, isDev: boolean): string => resolve(appData, `./${name}${isDev ? '-dev' : ''}`);

export default appDataPath;
