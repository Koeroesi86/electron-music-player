import { checkForUpdate, downloadUpdate, installUpdate } from './updater';
import type { UpdateSource } from './updater';
import type { UpdateState, UpdateStatus } from '../types/update';

interface UpdateManagerOptions {
  /** Undefined where the app does not update itself */
  source: UpdateSource | undefined;
  info: Pick<UpdateState, 'version' | 'electron' | 'chrome' | 'unavailable'>;
  /** Called with every new state, so the settings can show it */
  publish: (state: UpdateState) => void;
  now?: () => number;
  checkTimeout?: number;
  downloadStallTimeout?: number;
}

export interface UpdateManager {
  getState: () => UpdateState;
  /** Checks for an update and downloads it in the background; does nothing while a check runs or an update is downloaded */
  check: () => Promise<void>;
  /** Restarts into the downloaded update; does nothing before one is downloaded */
  install: () => void;
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** The manual update flow of the settings: check, download in the background, and install only when the user asks to restart */
export const createUpdateManager = ({ source, info, publish, now = Date.now, checkTimeout, downloadStallTimeout }: UpdateManagerOptions): UpdateManager => {
  let status: UpdateStatus = { kind: 'idle' };

  const getState = (): UpdateState => ({ ...info, status });
  const setStatus = (next: UpdateStatus) => {
    status = next;
    publish(getState());
  };

  const run = async (updateSource: UpdateSource) => {
    setStatus({ kind: 'checking' });
    const version = await checkForUpdate(updateSource, checkTimeout);

    if (!version) return setStatus({ kind: 'upToDate', checkedAt: now() });

    setStatus({ kind: 'downloading', version, percent: 0 });
    await downloadUpdate(updateSource, (percent) => setStatus({ kind: 'downloading', version, percent }), downloadStallTimeout);
    setStatus({ kind: 'ready', version });
  };

  return {
    getState,
    check: async () => {
      if (!source || ['checking', 'downloading', 'ready'].includes(status.kind)) return;

      await run(source).catch((error) => {
        console.error('Update failed', error);
        setStatus({ kind: 'failed', message: messageOf(error) });
      });
    },
    install: () => {
      if (!source || status.kind !== 'ready') return;

      installUpdate(source);
    },
  };
};
