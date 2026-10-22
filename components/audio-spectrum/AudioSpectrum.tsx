import { useEffect, useRef } from 'react';
import { useAudioListener } from '../../client/hooks/use-audio-listener';
import style from './AudioSpectrum.scss';

interface MeterStop {
  stop: number;
  color: string;
}

export interface AudioSpectrumProps {
  width?: number;
  height?: number;
  capColor?: string;
  capHeight?: number;
  meterWidth?: number;
  meterCount?: number;
  meterColor?: string | MeterStop[];
  gap?: number;
  fps?: number;
  createAnalyser?: () => AnalyserNode | undefined;
  addPlayStatusListener?: (listener: (isPlaying: boolean) => void) => void;
}

const defaultMeterColor: MeterStop[] = [
  { stop: 0, color: '#f00' },
  { stop: 0.5, color: '#0CD7FD' },
  { stop: 1, color: 'red' },
];

const createFill = (context: CanvasRenderingContext2D, meterColor: string | MeterStop[]) => {
  if (typeof meterColor === 'string') return meterColor;

  const gradient = context.createLinearGradient(0, 0, 0, 300);
  meterColor.forEach(({ stop, color }) => gradient.addColorStop(stop, color));
  return gradient;
};

// @see https://github.com/hu-ke/react-audio-spectrum
const AudioSpectrum = ({
  width = 200,
  height = 150,
  capColor = '#FFF',
  capHeight = 2,
  meterWidth = 2,
  meterCount = 40 * (2 + 2),
  meterColor = defaultMeterColor,
  gap = 10,
  fps = 30,
  createAnalyser = () => undefined,
  addPlayStatusListener = () => {},
}: AudioSpectrumProps) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const canvasContext = useRef<CanvasRenderingContext2D | null>(null);
  const analyser = useRef<AnalyserNode | undefined>(undefined);
  const isPlaying = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const animationId = useRef<number>(undefined);

  const stopAnimation = () => {
    clearTimeout(timer.current);
    window.cancelAnimationFrame(animationId.current ?? 0);
  };

  const drawSpectrum = () => {
    const context = canvasContext.current;
    if (!canvas.current || !context) return;

    // a running loop would keep drawing next to the new one
    stopAnimation();

    const canvasWidth = canvas.current.width;
    const canvasHeight = canvas.current.height - capHeight;
    const caps: number[] = []; // the vertical position of the caps in the previous frame
    const fill = createFill(context, meterColor);

    const clearCanvas = () => context.clearRect(0, 0, canvasWidth, canvasHeight + capHeight);
    const getY = (value: number) => ((255 - value) * canvasHeight) / 255;
    const drawRect = (i: number, y: number, rectHeight: number) => context.fillRect(i * (meterWidth + gap), y, meterWidth, rectHeight);

    const drawBars = (data: Uint8Array) => {
      const step = Math.round(data.length / meterCount); // sample limited data from the total array
      clearCanvas();
      for (let i = 0; i < meterCount; i++) {
        const value = data[i * step];
        if (caps.length < Math.round(meterCount)) caps.push(value);

        context.fillStyle = capColor;
        // the cap falls slowly and jumps up with the meter
        caps[i] = value < caps[i] ? caps[i] - 1 : value;
        drawRect(i, getY(caps[i]), capHeight);

        context.fillStyle = fill;
        const y = getY(value) + capHeight;
        drawRect(i, y, canvasHeight - y + capHeight);
      }
    };

    const drawMeter = () => {
      if (analyser.current) {
        const data = new Uint8Array(analyser.current.frequencyBinCount); // item value of array: 0 - 255
        analyser.current.getByteFrequencyData(data);
        if (!isPlaying.current) {
          data.fill(0);
          // once all the caps reached the bottom there is nothing left to draw
          if (!caps.some((cap) => cap > 0)) {
            clearCanvas();
            if (animationId.current) window.cancelAnimationFrame(animationId.current);
            return;
          }
        }
        drawBars(data);
      }

      timer.current = setTimeout(() => {
        animationId.current = window.requestAnimationFrame(drawMeter);
      }, 1000 / fps);
    };

    animationId.current = window.requestAnimationFrame(drawMeter);
  };

  const connectCanvas = () => {
    canvasContext.current = canvas.current?.getContext('2d') ?? null;
    if (canvas.current) analyser.current = createAnalyser();
  };

  useAudioListener(addPlayStatusListener, (playing) => {
    isPlaying.current = playing;
    if (!playing) return stopAnimation();

    if (!analyser.current) analyser.current = createAnalyser();
    drawSpectrum();
  });

  useEffect(connectCanvas);
  useEffect(() => stopAnimation, []);

  return <canvas className={style.audioSpectrum} ref={canvas} width={width} height={height} />;
};

export default AudioSpectrum;
