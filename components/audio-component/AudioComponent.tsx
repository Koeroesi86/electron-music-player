import { useEffect, useRef } from 'react';
import type { Track } from '../../types/library';
import { useUpdateEffect } from '../../client/hooks/use-update-effect';
import { radioUuidOf } from '../../client/radio-track';

interface AudioComponentProps {
  currentSong: Track | null;
  isPlaying: boolean;
  volume: number;
  port: string;
  trackEnded: () => void;
  connectNode: (node: HTMLAudioElement | null) => void;
}

const sourceOf = (track: Track, port: string) => {
  const station = radioUuidOf(track.path);
  if (station) return `http://127.0.0.1:${port}/radio/${encodeURIComponent(station)}`;

  return /^http/.test(track.path) ? track.path : `http://127.0.0.1:${port}/local?path=${encodeURIComponent(track.path)}`;
};

const AudioComponent = ({ currentSong, isPlaying, volume, port, trackEnded, connectNode }: AudioComponentProps) => {
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

  // the play command can arrive before the source is set, so a new source starts here; a restored track stays paused
  useUpdateEffect(() => {
    if (!audio.current) return;

    audio.current.src = currentSong ? sourceOf(currentSong, port) : '';
    if (currentSong && isPlaying) audio.current.play().catch((err) => console.error(err));
  }, [currentSong]);

  return <audio style={{ display: 'none' }} ref={audio} crossOrigin="anonymous" onEnded={trackEnded} />;
};

export default AudioComponent;
