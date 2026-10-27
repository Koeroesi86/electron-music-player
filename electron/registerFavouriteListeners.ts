import { ipcMain } from 'electron';
import type { WebContents } from 'electron';
import type { ListenerContext } from './listenerContext';
import { addFavourite, getFavourites, removeFavourite } from './favouritesRepository';
import { withAvailability } from './favouriteAvailability';

const maxFieldLength = 2000;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isField = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= maxFieldLength;

/** The key of a renderer message, anything but plain text fields is dropped */
const toKey = (payload: unknown) => {
  const { source, kind, id } = isRecord(payload) ? payload : {};

  return isField(source) && isField(kind) && isField(id) ? { source, kind, id } : undefined;
};

const sendFavourites = async (context: ListenerContext, sender: WebContents) => {
  const favourites = await withAvailability(await getFavourites(context.database), context);
  // the window can be closed while the database and the station directory answer
  if (!sender.isDestroyed()) sender.send('FAVOURITES', { favourites });
};

const registerFavouriteListeners = (context: ListenerContext) => {
  const reply = (sender: WebContents, work: Promise<unknown>) => work.then(() => sendFavourites(context, sender)).catch((e) => console.error(e));

  ipcMain.on('FAVOURITES_LOAD', (event) => {
    reply(event.sender, Promise.resolve());
  });

  ipcMain.on('FAVOURITE_ADD', (event, payload: unknown) => {
    const key = toKey(payload);
    if (!key || !isRecord(payload) || !isRecord(payload.snapshot)) return;

    reply(event.sender, addFavourite(context.database, key, payload.snapshot));
  });

  ipcMain.on('FAVOURITE_REMOVE', (event, payload: unknown) => {
    const key = toKey(payload);
    if (!key) return;

    reply(event.sender, removeFavourite(context.database, key));
  });
};

export default registerFavouriteListeners;
