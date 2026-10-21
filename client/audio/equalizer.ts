export interface EqualizerBand {
  label: string;
  frequency: number;
}

export const equalizerBands: EqualizerBand[] = [
  { label: '70', frequency: 70 },
  { label: '180', frequency: 180 },
  { label: '320', frequency: 320 },
  { label: '600', frequency: 600 },
  { label: '1k', frequency: 1000 },
  { label: '3k', frequency: 3000 },
  { label: '6k', frequency: 6000 },
  { label: '12k', frequency: 12000 },
  { label: '14k', frequency: 14000 },
  { label: '16k', frequency: 16000 },
];

export const minGain = -12;
export const maxGain = 12;

export const defaultGains = equalizerBands.map(() => 0);

export const clampGain = (gain: number) => Math.min(maxGain, Math.max(minGain, Number.isFinite(gain) ? gain : 0));

// settings saved before gains were in dB hold another number of unscaled values, so they are dropped
export const restoreGains = (gains: unknown): number[] =>
  Array.isArray(gains) && gains.length === equalizerBands.length ? gains.map((gain) => clampGain(Number(gain))) : defaultGains;

export const bandType = (index: number): BiquadFilterType => {
  if (index === 0) return 'lowshelf';
  if (index === equalizerBands.length - 1) return 'highshelf';
  return 'peaking';
};

// the audio element drifts a little between the clock tick and the seek it triggers, which must not rewind it
const seekTolerance = 0.1;

export const needsSeek = (nodeTime: number, to: number) => Math.abs(nodeTime - to) > seekTolerance;
