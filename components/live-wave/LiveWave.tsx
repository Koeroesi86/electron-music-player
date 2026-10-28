import { useEffect, useRef } from 'react';
import { waveLayers, waveOffset } from './wave';
import style from './LiveWave.scss';

interface LiveWaveProps {
  isPlaying: boolean;
}

const reducedMotion = '(prefers-reduced-motion: reduce)';
const step = 2;
/** The longest time one frame can move the wave, so it does not jump after the window was in the background */
const maxFrameSeconds = 0.05;

/** What a station shows in place of the seek bar: it has no position, so a wave moves while it plays and stands still when it does not */
const LiveWave = ({ isPlaying }: LiveWaveProps) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const time = useRef(0);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;

    const moving = isPlaying && !window.matchMedia(reducedMotion).matches;
    let last = performance.now();
    let frame: number | undefined;

    const paint = () => {
      const ratio = window.devicePixelRatio || 1;
      const { clientWidth: width, clientHeight: height } = element;
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const xs = Array.from({ length: Math.floor(width / step) + 1 }, (_, index) => index * step);
      const accent = getComputedStyle(element).getPropertyValue('--accent').trim();
      waveLayers.forEach((layer) => {
        context.beginPath();
        xs.forEach((x, index) => {
          const y = height / 2 + waveOffset(layer, x, time.current, height);
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.globalAlpha = layer.alpha;
        context.strokeStyle = accent;
        context.lineWidth = layer.lineWidth;
        context.lineJoin = 'round';
        context.stroke();
      });
      context.globalAlpha = 1;
    };

    const tick = (now: number) => {
      time.current += Math.min((now - last) / 1000, maxFrameSeconds);
      last = now;
      paint();
      frame = window.requestAnimationFrame(tick);
    };

    paint();
    if (moving) frame = window.requestAnimationFrame(tick);
    window.addEventListener('resize', paint);

    return () => {
      window.cancelAnimationFrame(frame ?? 0);
      window.removeEventListener('resize', paint);
    };
  }, [isPlaying]);

  return <canvas className={style.wave} ref={canvas} aria-hidden="true" />;
};

export default LiveWave;
