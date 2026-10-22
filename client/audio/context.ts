import { createContext } from 'react';
import { needsSeek } from './equalizer';

type PlayStatusListener = (isPlaying: boolean) => void;
type TimeChangeListener = (currentTime: number) => void;

const createListeners = <T>() => {
  const listeners = new Set<(value: T) => void>();

  return {
    add: (listener: (value: T) => void) => listeners.add(listener),
    remove: (listener: (value: T) => void) => listeners.delete(listener),
    notify: (value: T) => listeners.forEach((listener) => listener(value)),
  };
};

const audioContext = new window.AudioContext();
let audioNode: HTMLAudioElement | null = null;
let audioSource: MediaElementAudioSourceNode | undefined;
// an element can only be wrapped once, a second createMediaElementSource on it throws
let sourceElement: HTMLAudioElement | null = null;
let analyser: AnalyserNode | undefined;
let mounted = false;
const playStatus = createListeners<boolean>();
const timeChange = createListeners<number>();
const connectedItems: AudioNode[] = [];
const audioMountListeners: (() => void)[] = [];
let timeChangeTimer: ReturnType<typeof setInterval> | undefined;
const currentTimeFPS = 5;
let currentTime = 0;

const onAudioMounted = (listener: () => void) => {
  audioMountListeners.push(listener);
  if (mounted) listener();
};

const seek = (to: number) => {
  currentTime = to;
  if (audioNode && audioNode.duration && needsSeek(audioNode.currentTime, to)) {
    audioNode.currentTime = to;
  }
};

const listenToPlayStatus = (node: HTMLAudioElement) => {
  node.addEventListener('pause', () => playStatus.notify(false));
  node.addEventListener('play', () => playStatus.notify(true));
  node.addEventListener('error', () => {
    console.warn('error playing', node.src);
    playStatus.notify(false);
  });
};

const startTimeChanges = () => {
  clearInterval(timeChangeTimer);
  timeChangeTimer = setInterval(() => {
    if (!audioNode) return;

    currentTime = audioNode.currentTime;
    timeChange.notify(currentTime);
  }, 1000 / currentTimeFPS);
};

const connectNode = (node: HTMLAudioElement | null) => {
  audioNode = node;
  if (!node || node === sourceElement) return;

  sourceElement = node;
  listenToPlayStatus(node);

  const source = audioContext.createMediaElementSource(node);
  audioSource = source;
  connectedItems.forEach((item) => source.connect(item));

  mounted = true;
  audioMountListeners.forEach((listener) => listener());

  seek(currentTime);
  startTimeChanges();
};

const connectToSource = (item: AudioNode) => {
  connectedItems.push(item);
  audioSource?.connect(item);
};

const play = () => {
  audioNode
    ?.play()
    .then(() => console.log('playing', audioNode?.src))
    .catch((err) => console.error(err));
};

const pause = () => audioNode?.pause();

const createAnalyser = (): AnalyserNode | undefined => {
  if (!audioSource) return undefined;

  // only listens: its output is not connected, as it would play the signal a second time, around the equalizer
  if (!analyser) {
    analyser = audioContext.createAnalyser();
    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 2048;
    audioSource.connect(analyser);
  }

  return analyser;
};

const createBiquadFilter = () => audioContext.createBiquadFilter();
const createGain = () => audioContext.createGain();
const connectDestination = (node: AudioNode) => node.connect(audioContext.destination);

export const Audio = createContext({
  addPlayStatusListener: (listener: PlayStatusListener) => void playStatus.add(listener),
  removePlayStatusListener: (listener: PlayStatusListener) => void playStatus.remove(listener),
  addTimeChangeListener: (listener: TimeChangeListener) => void timeChange.add(listener),
  connectNode,
  connectToSource,
  connectDestination,
  createBiquadFilter,
  createGain,
  onAudioMounted,
  play,
  pause,
  seek,
  createAnalyser,
});
