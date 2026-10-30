import { useEffect, useRef } from 'react';
import type { Track } from '../../types/library';
import { useUpdateEffect } from '../../client/hooks/use-update-effect';
import { radioUuidOf } from '../../client/radio-track';
import { sourceOf } from '../../client/audio/track-source';
import { useGaplessAudio } from '../../client/hooks/use-gapless-audio';

interface AudioComponentProps {
  currentSong: Track | null;
  isPlaying: boolean;
  volume: number;
  /** The track that follows the current one, the second element loads it while the current one plays */
  upNext: Track | null;
  trackEnded: () => void;
  connectNode: (node: HTMLAudioElement | null) => void;
  connectStandbyNode: (node: HTMLAudioElement | null) => void;
  activateNode: (node: HTMLAudioElement) => void;
}

/** After this many files in a row that cannot be played, the player stops instead of cycling through the whole queue */
const maxSkippedFiles = 10;
const maxReconnectDelay = 30_000;
const reconnectDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, maxReconnectDelay);

const elementIndexes = [0, 1];

const AudioComponent = ({ currentSong, isPlaying, volume, upNext, trackEnded, connectNode, connectStandbyNode, activateNode }: AudioComponentProps) => {
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const attempts = useRef(0);
  const skipped = useRef(0);
  const ended = useRef(false);
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
      const node = gapless.activeElement();
      if (!node || !currentSong) return;

      node.src = sourceOf(currentSong);
      node.play().catch((err) => console.error(err));
    }, reconnectDelay(attempts.current));
  };

  // seeking to the end again and again, as dragging the slider does, ends the track again and again, and each end is a step in the queue
  const stepOn = () => {
    if (isRadio) return reconnect();
    if (ended.current) return;

    ended.current = true;
    trackEnded();
  };

  const gapless = useGaplessAudio({
    currentSong,
    upNext,
    activateNode,
    onEnded: stepOn,
    onHandoff: () => {
      ended.current = false;
      trackEnded();
    },
  });

  // a file that cannot be played, such as one on a drive that is not there, is passed over for the next one
  const skipUnplayable = () => {
    skipped.current += 1;
    if (skipped.current <= maxSkippedFiles) trackEnded();
  };

  const handleError = (index: number) => {
    if (!gapless.handleError(index)) return;

    if (isRadio) reconnect();
    else if (currentSong && isPlaying) skipUnplayable();
  };

  const handlePlaying = (index: number) => {
    if (!gapless.handlePlaying(index)) return;

    attempts.current = 0;
    skipped.current = 0;
  };

  useEffect(() => stopReconnecting, []);

  useEffect(() => {
    skipped.current = 0;
    if (!isPlaying) stopReconnecting();
  }, [isPlaying]);

  useEffect(() => gapless.setVolume(volume), [volume]);

  useEffect(() => {
    connectNode(gapless.elements.current[0]);
    connectStandbyNode(gapless.elements.current[1]);
    // the audio elements live as long as the component
  }, []);

  // the play command can arrive before the source is set, so a new source starts here; a restored track stays paused
  useUpdateEffect(() => {
    stopReconnecting();
    attempts.current = 0;
    ended.current = false;
    const source = currentSong ? sourceOf(currentSong) : '';
    if (gapless.changeTrack(source, isPlaying)) return;

    const node = gapless.load(source);
    if (node && currentSong && isPlaying) node.play().catch((err) => console.error(err));
  }, [currentSong]);

  useEffect(gapless.preloadNext, [currentSong, upNext]);

  return (
    <>
      {elementIndexes.map((index) => (
        <audio
          key={index}
          style={{ display: 'none' }}
          ref={gapless.register(index)}
          crossOrigin="anonymous"
          preload="auto"
          onEnded={() => gapless.handleEnded(index)}
          onPlay={() => {
            if (gapless.isActive(index)) ended.current = false;
          }}
          onPause={(event) => gapless.handlePause(index, event)}
          onError={() => handleError(index)}
          onPlaying={() => handlePlaying(index)}
          onTimeUpdate={() => gapless.handleTimeUpdate(index)}
        />
      ))}
    </>
  );
};

export default AudioComponent;
