import fs from 'fs';
import type { WebContents } from 'electron';
import type { Folder, Track } from '../types/library';
import executeQuery from './executeQuery';
import scanFolders from './scanFolders';

function rescanLibrary(sender: WebContents, forced = false) {
  const database = global._database;
  if (!database) return;
  console.log(`Scanning library ${forced ? 'completely' : 'wisely'}...`);
  executeQuery<Folder>(database, {
    query: `SELECT * FROM folders ORDER BY path ASC`,
    variables: [],
  })
    .then(async (folders) => {
      const modified = new Map(
        folders.filter((folder) => fs.existsSync(folder.path)).map((folder) => [folder.path, Math.floor(fs.statSync(folder.path).mtimeMs)])
      );
      const changed = folders.filter((folder) => (forced ? modified.has(folder.path) : folder.lastModified < (modified.get(folder.path) ?? 0)));

      await scanFolders(changed, sender);

      // stored after the scan, with the time seen before it, so a failed or interrupted scan is retried
      return Promise.all(
        changed.map((folder) =>
          executeQuery(database, {
            query: `INSERT OR REPLACE INTO folders (path, lastModified) VALUES (?, ?)`,
            variables: [folder.path, modified.get(folder.path)],
          })
        )
      );
    })
    .then(() =>
      executeQuery<Track>(database, {
        query: `SELECT * FROM library ORDER BY path ASC`,
        variables: [],
      })
    )
    .then((tracks) => {
      const queries = tracks
        .filter((track) => !fs.existsSync(track.path))
        .map((track) => {
          console.log(`Removing non existent ${track.path}`);
          return executeQuery(database, {
            query: `DELETE FROM library WHERE path = ?`,
            variables: [track.path],
          });
        });

      console.log(`Removing ${queries.length} of ${tracks.length} songs`);

      return Promise.all(queries);
    })
    .then(() => {
      sender.send('RESCAN_COMPLETE', {});
    })
    .catch((e) => console.error(e));
}

export default rescanLibrary;
