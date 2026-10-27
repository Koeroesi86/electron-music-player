import { useRef } from 'react';
import type { ReactNode } from 'react';
import classNames from 'classnames';
import {
  FiBarChart2 as EQIcon,
  FiVolumeX as VolumeOffIcon,
  FiVolume2 as VolumeFullIcon,
  FiSkipForward as ForwardIcon,
  FiSkipBack as BackIcon,
  FiShuffle as ShuffleIcon,
  FiRepeat as RepeatIcon,
} from 'react-icons/fi';
import { MdPlayCircleOutline as PlayIcon, MdPauseCircleOutline as PauseIcon } from 'react-icons/md';
import Slider from '../slider/Slider';
import type { Track } from '../../types/library';
import { toNowPlaying } from '../../client/now-playing';
import { useMediaSession } from '../../client/hooks/use-media-session';
import { useAudioListener } from '../../client/hooks/use-audio-listener';
import { useUpdateEffect } from '../../client/hooks/use-update-effect';
import { useTranslation } from '../../client/i18n';
import style from './PlayerControls.scss';
import ScanProgress from '../scan-progress';
import Time from '../time';

interface PlayerControlsProps {
  currentSong: Track | null;
  streamTitle: string | null;
  streamArt: string | null;
  currentTime: number;
  volume: number;
  shuffle: boolean;
  repeat: boolean;
  isPlaying: boolean;
  addPlayStatusListener: (listener: (isPlaying: boolean) => void) => void;
  addTimeChangeListener: (listener: (currentTime: number) => void) => void;
  seek: (to: number) => void;
  play: () => void;
  pause: () => void;
  setCurrentTime: (currentTime: number) => void;
  setPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number | string) => void;
  openEqualizer: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  nextSong: () => void;
  previousSong: () => void;
}

const round = (number: number) => Math.floor(number * 100);

interface IconButtonProps {
  label: string;
  className?: string;
  onClick: () => void;
  children: ReactNode;
}

const IconButton = ({ label, className = style.icon, onClick, children }: IconButtonProps) => (
  <button className={className} onClick={onClick} title={label} aria-label={label}>
    {children}
  </button>
);

const TrackDetails = ({
  currentSong,
  streamTitle,
  streamArt,
  currentTime,
}: Pick<PlayerControlsProps, 'currentSong' | 'streamTitle' | 'streamArt' | 'currentTime'>) => {
  const { t } = useTranslation();
  const shown = currentSong ? toNowPlaying(currentSong, streamTitle, streamArt) : undefined;

  useMediaSession(shown && { title: shown.track.title, artist: shown.track.artist, album: shown.track.album, cover: shown.cover });

  return (
    <div className={style.meta}>
      <div className={style.contents}>
        <div className={style.picture} style={shown?.cover ? { backgroundImage: `url("${shown.cover}")` } : {}} />
        <div className={style.details}>
          <div className={style.title}>{shown ? shown.track.title : t('player.none')}</div>
          <div className={style.album}>{shown ? shown.track.album : t('player.none')}</div>
          <div className={style.artist}>{shown ? shown.track.artist : t('player.none')}</div>
          <div className={style.time}>
            <Time seconds={currentTime} /> / <Time seconds={currentSong ? currentSong.duration : 0} />
          </div>
        </div>
      </div>
    </div>
  );
};

type TransportButtonsProps = Pick<
  PlayerControlsProps,
  'currentSong' | 'isPlaying' | 'shuffle' | 'repeat' | 'play' | 'pause' | 'previousSong' | 'nextSong' | 'toggleShuffle' | 'toggleRepeat'
>;

const TransportButtons = ({
  currentSong,
  isPlaying,
  shuffle,
  repeat,
  play,
  pause,
  previousSong,
  nextSong,
  toggleShuffle,
  toggleRepeat,
}: TransportButtonsProps) => {
  const { t } = useTranslation();

  return (
    <div className={style.mainControlButtons}>
      <button className={style.controlButton} onClick={previousSong} title={t('player.previous')}>
        <BackIcon size={'16px'} />
      </button>
      <button
        onClick={isPlaying ? pause : play}
        className={classNames(style.playToggleButton, { [style.playing]: isPlaying })}
        disabled={!currentSong}
        title={isPlaying ? t('player.pause') : t('player.play')}
      >
        <PauseIcon className={style.pauseIcon} size={'40px'} />
        <PlayIcon className={style.playIcon} size={'40px'} />
      </button>
      <button className={style.controlButton} onClick={nextSong} title={t('player.next')}>
        <ForwardIcon size={'16px'} />
      </button>
      <button className={classNames(style.controlButton, { [style.active]: shuffle })} onClick={toggleShuffle} title={t('player.shuffle')}>
        <ShuffleIcon size={'12px'} />
      </button>
      <button className={classNames(style.controlButton, { [style.active]: repeat })} onClick={toggleRepeat} title={t('player.repeat')}>
        <RepeatIcon size={'12px'} />
      </button>
      <ScanProgress />
    </div>
  );
};

const VolumeControls = ({ volume, setVolume, openEqualizer }: Pick<PlayerControlsProps, 'volume' | 'setVolume' | 'openEqualizer'>) => {
  const { t } = useTranslation();
  const volumeBeforeMute = useRef(0.5);

  const toggleMute = () => {
    if (volume > 0) volumeBeforeMute.current = volume;
    setVolume(volume > 0 ? 0 : volumeBeforeMute.current);
  };

  return (
    <div className={style.volume}>
      <IconButton label={t('player.equalizer')} onClick={openEqualizer}>
        <EQIcon size={'16px'} />
      </IconButton>
      <IconButton label={volume > 0 ? t('player.mute') : t('player.unmute')} onClick={toggleMute}>
        <VolumeOffIcon size={'16px'} />
      </IconButton>
      <div className={style.slider}>
        <Slider min={0} max={1} step={0.01} value={volume} onInput={(e) => setVolume(e.currentTarget.value)} />
      </div>
      <IconButton label={t('player.fullVolume')} onClick={() => setVolume(1)}>
        <VolumeFullIcon size={'16px'} />
      </IconButton>
    </div>
  );
};

const PlayerControls = (props: PlayerControlsProps) => {
  const { currentSong, currentTime, isPlaying, seek, play, pause, setCurrentTime, setPlaying, addPlayStatusListener, addTimeChangeListener } = props;

  useAudioListener(addPlayStatusListener, (playing) => {
    if (isPlaying !== playing) setPlaying(playing);
  });

  useAudioListener(addTimeChangeListener, (time) => {
    if (round(time) !== round(currentTime)) setCurrentTime(time);
  });

  useUpdateEffect(() => seek(currentTime), [currentTime]);
  useUpdateEffect(() => (isPlaying ? play() : pause()), [isPlaying]);
  useUpdateEffect(() => {
    if (isPlaying) play();
  }, [currentSong]);

  return (
    <div className={style.controls}>
      <div className={style.controlsPanel}>
        <TrackDetails currentSong={currentSong} streamTitle={props.streamTitle} streamArt={props.streamArt} currentTime={currentTime} />
        <div className={style.controlsContainer}>
          <div className={style.progress}>
            <Slider
              min={0}
              max={currentSong?.duration ?? 0}
              step={0.0001}
              value={currentTime}
              onInput={(e) => setCurrentTime(parseFloat(e.currentTarget.value))}
            />
          </div>
          <div className={style.mainControlContainer}>
            <TransportButtons {...props} />
            <VolumeControls volume={props.volume} setVolume={props.setVolume} openEqualizer={props.openEqualizer} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerControls;
