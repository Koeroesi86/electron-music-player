export interface WaveLayer {
  alpha: number;
  amplitude: number;
  frequency: number;
  speed: number;
  /** How fast the height of the wave changes along it */
  modulation: number;
  lineWidth: number;
  phase: number;
}

/** A strong wave and a fainter, faster one behind it */
export const waveLayers: WaveLayer[] = [
  { alpha: 1, amplitude: 1, frequency: 0.9, speed: 1, modulation: 1.6, lineWidth: 2, phase: 0 },
  { alpha: 0.45, amplitude: 0.6, frequency: 1.4, speed: 1.7, modulation: 2.3, lineWidth: 1.5, phase: 2 },
];

const peakShare = 0.2;

/** The distance of a layer from the middle line at `x` pixels and `time` seconds, on a canvas of `height` pixels */
export const waveOffset = (layer: WaveLayer, x: number, time: number, height: number) => {
  const envelope = 0.55 + 0.45 * Math.sin(x / 90 - time * layer.modulation);
  return Math.sin((x / 14) * layer.frequency + time * layer.speed * 4 + layer.phase) * height * peakShare * layer.amplitude * envelope;
};
