import { PureComponent } from 'react';
import type { CSSProperties } from 'react';
import classNames from 'classnames';
import slugify from 'slugify';
import { basename } from 'path';
import { MdPlayArrow as PlayIcon } from 'react-icons/md';
import type { Track } from '../../types/library';
import style from './NowPlaying.scss';

interface NowPlayingProps {
  nowPlaying: Track[];
  currentSong: Track | null;
  port: string;
  playTrack: (track: Track) => void;
}

class NowPlaying extends PureComponent<NowPlayingProps> {
  get coverStyle() {
    const { currentSong, port } = this.props;
    const coverStyle: CSSProperties = {};

    if (currentSong && currentSong.picture) {
      const cover = basename(currentSong.picture);
      coverStyle.backgroundImage = `url("http://127.0.0.1:${port}/albumart/${cover}")`;
    }

    return coverStyle;
  }

  render() {
    const { nowPlaying, currentSong, playTrack } = this.props;
    return (
      <div className={style.nowPlaying}>
        <div className={style.header}>Now playing</div>
        <div className={style.contents}>
          {currentSong && (
            <div className={style.currentSong}>
              <div className={style.cover} style={this.coverStyle} />
              <div className={style.meta}>
                <div className={style.title}>
                  {currentSong.track ? <span className={style.trackNo}>#{currentSong.track}</span> : ''}
                  {currentSong.title}
                </div>
                <div className={style.album}>{currentSong.album}</div>
                <div className={style.artist}>{currentSong.artist}</div>
              </div>
            </div>
          )}
          <div className={style.tracks}>
            {nowPlaying.map((track) => (
              <div
                key={`now-playing-track-${slugify(track.path, { remove: /[*+~./()'",!:@\\]/g, lower: true })}`}
                className={classNames(style.track, {
                  [style.current]: currentSong && track.path === currentSong.path,
                })}
                onDoubleClick={() => playTrack(track)}
                title={`#${track.track ? track.track + ' ' : ''}${track.title}`}
              >
                <span className={style.playButton} onClick={() => playTrack(track)}>
                  <PlayIcon className={style.playIcon} size={'12px'} />
                </span>
                {track.track ? <span className={style.trackNo}>#{track.track}</span> : ''}
                {track.title}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

export default NowPlaying;
