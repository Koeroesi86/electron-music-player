import type { Track } from '../types/library';

const toKilohertz = (sampleRate: number) => `${Math.round(sampleRate / 100) / 10}`;

/** The badge of a track: the codec, then the depth and rate of a lossless one (FLAC 24/96), `V` for a variable bitrate or the bitrate of a lossy one (MP3 320); undefined when the codec is not known */
export const audioFormatLabel = ({ codec, bitDepth, sampleRate, bitrate, vbr, lossless }: Track) => {
  if (!codec) return undefined;
  const detail = lossless
    ? [bitDepth, sampleRate && toKilohertz(sampleRate)].filter(Boolean).join('/')
    : vbr
      ? 'V'
      : bitrate && `${Math.round(bitrate / 1000)}`;

  return [codec, detail].filter(Boolean).join(' ');
};
