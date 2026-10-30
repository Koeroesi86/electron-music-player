const quitting = new AbortController();

/** Aborted when the app quits; a scan stops at the next file and the folders it was scanning are scanned again at the next start */
export const quitSignal: AbortSignal = quitting.signal;

export const cancelScans = () => quitting.abort();
