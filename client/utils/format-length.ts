/** The length of an album or track as it fits a line of a tile: minutes and seconds (`48:12`), with the hours when there are any (`1:02:03`) */
export const formatLength = (seconds: number | string | null | undefined) => {
  const total = Math.max(0, Math.floor(parseFloat(`${seconds}`)) || 0);
  const [hours, minutes, rest] = [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60];
  const pad = (value: number) => `${value}`.padStart(2, '0');

  return hours ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
};
