/** Folders that changed are scanned once after a quiet time, so a big copy is one scan; a change during a scan is scanned after it, never two scans at once */
export const createRescanScheduler = (run: (folders: string[]) => Promise<void>, quietTime = 2000) => {
  const pending = new Set<string>();
  let timer: NodeJS.Timeout | undefined;
  let running = false;

  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(flush, quietTime);
  };

  async function flush() {
    if (running || pending.size === 0) return;

    const folders = [...pending];
    pending.clear();
    running = true;
    await run(folders)
      .catch((e) => console.error(e))
      .finally(() => {
        running = false;
      });
    if (pending.size > 0) arm();
  }

  return {
    schedule: (folder: string) => {
      pending.add(folder);
      arm();
    },
    cancel: () => {
      clearTimeout(timer);
      pending.clear();
    },
  };
};
