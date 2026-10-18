import { PureComponent } from 'react';
import type { Track } from '../../types/library';

interface AudioComponentProps {
  currentSong: Track | null;
  volume: number;
  port: string;
  trackEnded: () => void;
  connectNode: (node: HTMLAudioElement | null) => void;
}

class AudioComponent extends PureComponent<AudioComponentProps> {
  private audio: HTMLAudioElement | null = null;

  componentDidMount() {
    if (this.audio) {
      this.setVolume();

      this.props.connectNode(this.audio);
    }
  }

  componentDidUpdate(prevProps: AudioComponentProps) {
    if (prevProps.currentSong !== this.props.currentSong) {
      if (this.props.currentSong) {
        this.playTrack(this.props.currentSong);
      } else if (this.audio) {
        this.audio.src = '';
      }
    }

    if (prevProps.volume !== this.props.volume) {
      this.setVolume();
    }
  }

  playTrack(track: Track) {
    if (!this.audio) return;

    const src = track.path;
    if (/^http/.test(src)) {
      this.audio.src = src;
    } else {
      this.audio.src = `http://localhost:${this.props.port}/local?path=${encodeURIComponent(track.path)}`;
    }
  }

  setVolume() {
    if (this.audio && this.audio.volume !== this.props.volume) {
      this.audio.volume = this.props.volume;
    }
  }

  render() {
    const { trackEnded } = this.props;
    return (
      <audio
        style={{ display: 'none' }}
        ref={(a) => {
          this.audio = a;
        }}
        crossOrigin="anonymous"
        onEnded={trackEnded}
      />
    );
  }
}

export default AudioComponent;
