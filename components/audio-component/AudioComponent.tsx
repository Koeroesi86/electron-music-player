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

const maxReconnectDelay = 30_000;
const reconnectDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, maxReconnectDelay);

const AudioComponent = ({ currentSong, isPlaying, volume, port, trackEnded, connectNode }: AudioComponentProps) => {
  const audio = useRef<HTMLAudioElement>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const attempts = useRef(0);
  const isRadio = currentSong !== null && radioUuidOf(currentSong.path) !== undefined;
  const shouldReconnect = isRadio && isPlaying;

  const stopReconnecting = () => {
    clearTimeout(reconnectTimer.current);
    reconnectTimer.current = undefined;
  };

  // a station has no end: when its stream stops, the same address is asked again, with a growing pause between the attempts
  const reconnect = () => {
    if (!shouldReconnect || reconnectTimer.current) return;

    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = undefined;
      attempts.current += 1;
      if (!audio.current || !currentSong) return;

      audio.current.src = sourceOf(currentSong, port);
      audio.current.play().catch((err) => console.error(err));
    }, reconnectDelay(attempts.current));
  };

  useEffect(() => stopReconnecting, []);

  useEffect(() => {
    if (!isPlaying) stopReconnecting();
  }, [isPlaying]);

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
    stopReconnecting();
    attempts.current = 0;
    if (!audio.current) return;

    audio.current.src = currentSong ? sourceOf(currentSong, port) : '';
    if (currentSong && isPlaying) audio.current.play().catch((err) => console.error(err));
  }, [currentSong]);

  return (
    <audio
      style={{ display: 'none' }}
      ref={audio}
      crossOrigin="anonymous"
      onEnded={isRadio ? reconnect : trackEnded}
      onError={reconnect}
      onPlaying={() => (attempts.current = 0)}
    />
  );
};

export default AudioComponent;
