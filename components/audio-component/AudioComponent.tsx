import { useEffect, useRef } from 'react';
import type { Track } from '../../types/library';
import { useUpdateEffect } from '../../client/hooks/use-update-effect';
import { radioUuidOf } from '../../client/radio-track';
import { localUrl } from '../../client/local-url';
import { useLatest } from '../../client/hooks/use-latest';
import { createLeadMeter, msUntilHandoff } from '../../client/audio/gapless';

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

const sourceOf = (track: Track) => {
  const station = radioUuidOf(track.path);
  if (station) return localUrl(`/radio/${encodeURIComponent(station)}`);

  return /^http/.test(track.path) ? track.path : localUrl(`/track?path=${encodeURIComponent(track.path)}`);
};

/** After this many files in a row that cannot be played, the player stops instead of cycling through the whole queue */
const maxSkippedFiles = 10;
const maxReconnectDelay = 30_000;
const reconnectDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, maxReconnectDelay);

/** HAVE_FUTURE_DATA: the element can play on without waiting */
const canPlayOn = 3;
const elementIndexes = [0, 1];

const isFileTrack = (track: Track | null): track is Track => track !== null && radioUuidOf(track.path) === undefined;

const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';

/**
 * Two audio elements take turns: while one plays, the other loads the track that follows and starts a little before the end of the playing one,
 * so the next track sounds as the current one is done. Both feed the same input of the audio context, so the equalizer is not rebuilt in between.
 */
const AudioComponent = ({ currentSong, isPlaying, volume, upNext, trackEnded, connectNode, connectStandbyNode, activateNode }: AudioComponentProps) => {
  const elements = useRef<(HTMLAudioElement | null)[]>([null, null]);
  const active = useRef(0);
  // the source each element holds, so a track that is loaded already is not loaded again
  const loaded = useRef<(string | undefined)[]>([undefined, undefined]);
  // the source the standby element took over with, as the current song of the state follows a moment later
  const swappedTo = useRef<string | undefined>(undefined);
  const handoffTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // set from the call to play of the standby element until it plays
  const handoffStartedAt = useRef<number | undefined>(undefined);
  const leadMeter = useRef(createLeadMeter());
  const latest = useLatest({ currentSong, upNext });
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const attempts = useRef(0);
  const skipped = useRef(0);
  const ended = useRef(false);
  const isRadio = currentSong !== null && radioUuidOf(currentSong.path) !== undefined;
  const shouldReconnect = isRadio && isPlaying;
  const activeElement = () => elements.current[active.current];
  const standbyIndex = () => 1 - active.current;
  const standbyElement = () => elements.current[standbyIndex()];

  // a file that cannot be played, such as one on a drive that is not there, is passed over for the next one
  const skipUnplayable = () => {
    skipped.current += 1;
    if (skipped.current <= maxSkippedFiles) trackEnded();
  };

  const cancelHandoff = () => {
    clearTimeout(handoffTimer.current);
    handoffTimer.current = undefined;
    if (handoffStartedAt.current === undefined) return;

    handoffStartedAt.current = undefined;
    standbyElement()?.pause();
  };

  // the standby element is loaded with the track that follows; a station has no end and no next track, so it loads nothing
  const preloadNext = () => {
    const index = standbyIndex();
    const node = elements.current[index];
    const { currentSong: song, upNext: following } = latest.current;
    // an element that still plays the end of the last track is loaded when it ends
    if (!node || handoffStartedAt.current !== undefined || !node.paused) return;

    const wanted = isFileTrack(song) && isFileTrack(following) ? sourceOf(following) : undefined;
    if (loaded.current[index] === wanted) return;

    loaded.current[index] = wanted;
    if (wanted) node.src = wanted;
    else node.removeAttribute('src');
    node.load();
  };

  // seeking to the end again and again, as dragging the slider does, ends the track again and again, and each end is a step in the queue
  const handleEnded = (index: number) => {
    // the end of the track that the other element took over from
    if (index !== active.current) {
      loaded.current[index] = undefined;
      return preloadNext();
    }

    if (isRadio) return reconnect();
    // the standby element is starting, it steps to the next track when it plays
    if (ended.current || handoffStartedAt.current !== undefined) return;

    ended.current = true;
    trackEnded();
  };

  const failHandoff = () => {
    handoffStartedAt.current = undefined;
    // the playing track ended while the standby element started: nothing else steps on, so the usual end follows
    if (activeElement()?.ended) handleEnded(active.current);
  };

  const startHandoff = () => {
    handoffTimer.current = undefined;
    const index = standbyIndex();
    const node = standbyElement();
    // a track that is not loaded in time follows the usual way, once the current one ends
    if (!node || !loaded.current[index] || node.readyState < canPlayOn) return;

    handoffStartedAt.current = performance.now();
    node.play().catch((err) => {
      if (isAbort(err)) return;

      console.error(err);
      loaded.current[index] = undefined;
      failHandoff();
    });
  };

  // the next track starts as much before the end as the start of an element took the last times
  const scheduleHandoff = () => {
    clearTimeout(handoffTimer.current);
    handoffTimer.current = undefined;
    const node = activeElement();
    if (!node || node.paused || handoffStartedAt.current !== undefined || !loaded.current[standbyIndex()]) return;

    const wait = msUntilHandoff(node.duration, node.currentTime, leadMeter.current.lead());
    if (wait !== undefined) handoffTimer.current = setTimeout(startHandoff, wait);
  };

  // the standby element plays: the track that follows is the current one, the other element only finishes its last moments
  const completeHandoff = (index: number) => {
    const startedAt = handoffStartedAt.current;
    const node = elements.current[index];
    if (startedAt === undefined || !node) return;

    handoffStartedAt.current = undefined;
    leadMeter.current.record((performance.now() - startedAt) / 1000);
    active.current = index;
    activateNode(node);
    swappedTo.current = loaded.current[index];
    ended.current = false;
    trackEnded();
  };

  const handleError = (index: number) => {
    if (index !== active.current) {
      loaded.current[index] = undefined;
      if (handoffStartedAt.current !== undefined) failHandoff();
      return;
    }

    if (isRadio) reconnect();
    else if (currentSong && isPlaying) skipUnplayable();
  };

  const handlePlaying = (index: number) => {
    if (index !== active.current) return completeHandoff(index);

    attempts.current = 0;
    skipped.current = 0;
    scheduleHandoff();
  };

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
      const node = activeElement();
      if (!node || !currentSong) return;

      node.src = sourceOf(currentSong);
      node.play().catch((err) => console.error(err));
    }, reconnectDelay(attempts.current));
  };

  // a track that was asked for while the standby element holds it (Next) continues there
  const takeOver = (index: number, node: HTMLAudioElement) => {
    const previous = activeElement();
    loaded.current[active.current] = undefined;
    active.current = index;
    activateNode(node);
    previous?.pause();
    node.currentTime = 0;
    if (isPlaying) node.play().catch((err) => console.error(err));
  };

  useEffect(
    () => () => {
      stopReconnecting();
      cancelHandoff();
    },
    []
  );

  useEffect(() => {
    skipped.current = 0;
    if (!isPlaying) stopReconnecting();
  }, [isPlaying]);

  useEffect(() => {
    elements.current.forEach((node) => {
      if (node && node.volume !== volume) node.volume = volume;
    });
  }, [volume]);

  useEffect(() => {
    connectNode(elements.current[0]);
    connectStandbyNode(elements.current[1]);
    // the audio elements live as long as the component
  }, []);

  // the play command can arrive before the source is set, so a new source starts here; a restored track stays paused
  useUpdateEffect(() => {
    stopReconnecting();
    attempts.current = 0;
    ended.current = false;
    cancelHandoff();
    const source = currentSong ? sourceOf(currentSong) : '';
    const handedOver = source !== '' && swappedTo.current === source;
    swappedTo.current = undefined;
    const node = activeElement();
    const standby = standbyElement();
    if (handedOver || !node) return;

    if (source && standby && loaded.current[standbyIndex()] === source) return takeOver(standbyIndex(), standby);

    loaded.current[active.current] = source || undefined;
    node.src = source;
    if (currentSong && isPlaying) node.play().catch((err) => console.error(err));
  }, [currentSong]);

  useEffect(preloadNext, [currentSong, upNext]);

  return (
    <>
      {elementIndexes.map((index) => (
        <audio
          key={index}
          style={{ display: 'none' }}
          ref={(node) => {
            elements.current[index] = node;
          }}
          crossOrigin="anonymous"
          preload="auto"
          onEnded={() => handleEnded(index)}
          onPlay={() => {
            if (index === active.current) ended.current = false;
          }}
          onPause={(event) => {
            if (index === active.current && !event.currentTarget.ended) cancelHandoff();
          }}
          onError={() => handleError(index)}
          onPlaying={() => handlePlaying(index)}
          onTimeUpdate={() => index === active.current && scheduleHandoff()}
        />
      ))}
    </>
  );
};

export default AudioComponent;
