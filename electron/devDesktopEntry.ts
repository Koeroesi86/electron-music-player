import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

const entryName = 'emusic-dev.desktop';

const getEntryFile = (dataHome: string) => join(dataHome, 'applications', entryName);

/** Wayland shells take the window icon from the desktop entry matching the app ID; it is hidden from the menu, as it starts nothing */
export const registerDevDesktopEntry = (dataHome: string, iconFile: string) => {
  mkdirSync(join(dataHome, 'applications'), { recursive: true });
  writeFileSync(
    getEntryFile(dataHome),
    ['[Desktop Entry]', 'Type=Application', 'Name=eMusic (dev)', `Icon=${iconFile}`, 'Exec=true', 'StartupWMClass=emusic-dev', 'NoDisplay=true', ''].join('\n')
  );
};

/** Synchronous, as it runs while the app quits */
export const removeDevDesktopEntry = (dataHome: string) => rmSync(getEntryFile(dataHome), { force: true });
