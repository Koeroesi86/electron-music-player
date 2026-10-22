const pad = (value: number) => `${value}`.padStart(2, '0');

function Time({ seconds }: { seconds?: number | string | null }) {
  const total = Math.max(0, Math.floor(parseFloat(`${seconds}`)) || 0);

  return <span>{[Math.floor(total / 3600) % 24, Math.floor(total / 60) % 60, total % 60].map(pad).join(':')}</span>;
}

export default Time;
