import { ipcMain } from 'electron';
import type { ListenerContext } from './listenerContext';
import { toRadioQuery } from './radioBrowser';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'The station directory is not available');

const registerRadioListeners = ({ radio }: ListenerContext) => {
  ipcMain.on('RADIO_SEARCH', (event, payload: unknown) => {
    const query = toRadioQuery(payload);

    radio
      .searchStations(query)
      .then((stations) => event.sender.send('RADIO_STATIONS', { query, stations }))
      .catch((error) => event.sender.send('RADIO_STATIONS', { query, stations: [], error: errorMessage(error) }));
  });

  ipcMain.on('RADIO_TAGS', (event) => {
    radio
      .getTags()
      .then((tags) => event.sender.send('RADIO_TAGS_LOADED', { tags }))
      .catch((error) => console.error(error));
  });
};

export default registerRadioListeners;
