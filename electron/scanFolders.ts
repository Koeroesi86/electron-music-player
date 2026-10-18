import type { WebContents } from 'electron';
import type { Folder } from '../types/library';
import scanFolder from './scanFolder';

/** Scan provided folders for tracks */
function scanFolders(folders: Pick<Folder, 'path'>[], sender: WebContents): Promise<void> {
  return folders.reduce((p, folder) => p.then(() => scanFolder(folder.path, sender)), Promise.resolve());
}

export default scanFolders;
