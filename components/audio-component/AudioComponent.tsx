import { useEffect, useRef } from 'react';
import type { Track } from '../../types/library';
import { useUpdateEffect } from '../../client/hooks/use-update-effect';

interface AudioComponentProps {
  currentSong: Track | null;
  volume: number;
  port: string;
  trackEnded: () => void;
  connectNode: (node: HTMLAudioElement | null) => void;
}

const sourceOf = (track: Track, port: string) =>
  /^http/.test(track.path) ? track.path : `http://127.0.0.1:${port}/local?path=${encodeURIComponent(track.path)}`;

const AudioComponent = ({ currentSong, volume, port, trackEnded, connectNode }: AudioComponentProps) => {
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audio.current && audio.current.volume !== volume) {
      audio.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audio.current) connectNode(audio.current);
    // the audio element lives as long as the component
  }, []);

  useUpdateEffect(() => {
    if (audio.current) audio.current.src = currentSong ? sourceOf(currentSong, port) : '';
  }, [currentSong]);

  return <audio style={{ display: 'none' }} ref={audio} crossOrigin="anonymous" onEnded={trackEnded} />;
};

export default AudioComponent;
