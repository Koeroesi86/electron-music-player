import { createContext } from 'react';

type PlayStatusListener = (isPlaying: boolean) => void;
type TimeChangeListener = (currentTime: number) => void;

const audioContext = new window.AudioContext();
let audioNode: HTMLAudioElement | null = null;
let audioSource: MediaElementAudioSourceNode | undefined;
let isPlaying = false;
const listeners: PlayStatusListener[] = [];
const connectedItems: AudioNode[] = [];
const audioMountListeners: (() => void)[] = [];
const timeChangeListeners: TimeChangeListener[] = [];
let timeChangeTimer: ReturnType<typeof setInterval> | undefined;
const currentTimeFPS = 5;
let currentTime = 0;

const onAudioMounted = (listener: () => void) => {
  audioMountListeners.push(listener);
};

const notifyListeners = () => {
  listeners.forEach((listener) => {
    listener(isPlaying);
  });
};

const connectNode = (node: HTMLAudioElement | null) => {
  audioNode = node;

  if (node) {
    node.addEventListener('pause', () => {
      isPlaying = false;
      notifyListeners();
    });
    node.addEventListener('play', () => {
      isPlaying = true;
      notifyListeners();
    });
    node.addEventListener('error', () => {
      isPlaying = false;
      console.warn('error playing', node.src);
      notifyListeners();
    });

    const source = audioContext.createMediaElementSource(node);
    audioSource = source;

    connectedItems.forEach((item) => {
      source.connect(item);
      connectDestination(item);
    });

    audioMountListeners.forEach((cb) => {
      cb();
    });

    seek(currentTime);

    clearInterval(timeChangeTimer);
    timeChangeTimer = setInterval(() => {
      if (audioNode) {
        const { currentTime: nodeTime } = audioNode;
        currentTime = nodeTime;
        timeChangeListeners.forEach((listener) => {
          listener(nodeTime);
        });
      }
    }, 1000 / currentTimeFPS);
  }
};

const seek = (to: number) => {
  currentTime = to;
  if (audioNode && audioNode.duration && audioNode.currentTime !== to) {
    audioNode.currentTime = to;
  }
};

const connectToSource = (item: AudioNode) => {
  connectedItems.push(item);
  if (audioSource) {
    audioSource.connect(item);
  }
};

const disconnectFromSource = (item: AudioNode) => {
  if (connectedItems.includes(item)) {
    if (audioSource) {
      audioSource.disconnect(item);
    }
  }
};

const play = () => {
  if (audioNode) {
    const playPromise = audioNode.play();

    if (playPromise) {
      playPromise
        .then(() => {
          console.log('playing', audioNode?.src);
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }
};

const pause = () => {
  if (audioNode) {
    audioNode.pause();
  }
};

const addPlayStatusListener = (listener: PlayStatusListener) => {
  if (typeof listener === 'function') listeners.push(listener);
};

const removePlayStatusListener = (listener: PlayStatusListener) => {
  if (listeners.includes(listener)) {
    listeners.splice(listeners.indexOf(listener), 1);
  }
};

const addTimeChangeListener = (listener: TimeChangeListener) => {
  if (!timeChangeListeners.includes(listener)) timeChangeListeners.push(listener);
};

const createAnalyser = (): AnalyserNode | false => {
  if (audioSource) {
    const analyser = audioContext.createAnalyser();
    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 2048;

    audioSource.connect(analyser);
    connectDestination(analyser);

    return analyser;
  }

  return false;
};

const createBiquadFilter = () => audioContext.createBiquadFilter();
const createGain = () => audioContext.createGain();
const connectDestination = (node: AudioNode) => node.connect(audioContext.destination);

export const Audio = createContext({
  addPlayStatusListener,
  removePlayStatusListener,
  addTimeChangeListener,
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
