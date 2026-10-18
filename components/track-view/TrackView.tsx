import { PureComponent } from 'react';
import _ from 'lodash';
import type { Track } from '../../types/library';
import style from './TrackView.scss';
import TrackViewItem from '../track-view-item';
import type { TrackLabels } from '../track-view-item/TrackViewItem';

interface TrackViewProps {
  tracks: Track[];
  currentSong: Track | null;
  loaded: boolean;
  playTracks: (tracks: Track[]) => void;
}

interface TrackViewState {
  selectedTracks: Track[];
}

const headerLabels: TrackLabels = {
  duration: 'Duration',
  artist: 'Artist',
  year: 'Year',
  album: 'Album',
  track: '#',
  title: 'Title',
};

class TrackView extends PureComponent<TrackViewProps, TrackViewState> {
  private separator: HTMLDivElement | null = null;
  private listing: HTMLDivElement | null = null;

  state: TrackViewState = {
    selectedTracks: [],
  };

  onScroll = _.debounce((e: Event) => {
    if (!this.separator || !(e.target instanceof HTMLElement)) return;

    const { scrollTop } = e.target;
    const { classList } = this.separator;

    if (scrollTop > 0) {
      if (!classList.contains(style.scrolled)) {
        classList.add(style.scrolled);
      }
    } else {
      if (classList.contains(style.scrolled)) {
        classList.remove(style.scrolled);
      }
    }
  }, 50);

  componentDidMount() {
    if (this.listing) {
      this.listing.addEventListener('scroll', this.onScroll, { passive: true });
    }
  }

  componentWillUnmount() {
    if (this.listing) {
      this.listing.removeEventListener('scroll', this.onScroll);
    }
  }

  toggleTrack = (track: Track) => {
    const prevSelectedTracks = this.state.selectedTracks.slice(0);
    if (!prevSelectedTracks.includes(track)) {
      prevSelectedTracks.push(track);
      this.setState({
        selectedTracks: prevSelectedTracks,
      });
    } else {
      const index = prevSelectedTracks.indexOf(track);
      prevSelectedTracks.splice(index, 1);
      this.setState({
        selectedTracks: prevSelectedTracks,
      });
    }
  };

  doubleClickTrack = (track: Track) => {
    const selectedTracks = [track];
    this.props.playTracks(selectedTracks);
    this.setState({
      selectedTracks,
    });
  };

  render() {
    const { currentSong, playTracks, tracks, loaded } = this.props;
    const { selectedTracks } = this.state;
    return (
      <div className={style.tracks}>
        <TrackViewItem track={headerLabels} isHeader />
        <div
          ref={(s) => {
            this.separator = s;
          }}
          className={style.separator}
        />
        <div
          className={style.listing}
          ref={(l) => {
            this.listing = l;
          }}
        >
          {loaded &&
            tracks.map((track) => (
              <TrackViewItem
                key={track.path}
                track={track}
                isSelected={selectedTracks.includes(track)}
                isCurrent={currentSong?.path === track.path}
                clickTrack={this.toggleTrack}
                doubleClickTrack={this.doubleClickTrack}
              />
            ))}
        </div>
        <div className={style.controls}>
          <button
            onClick={() => {
              this.setState({ selectedTracks: [] });
            }}
          >
            Clear selection
          </button>
          <button
            onClick={() => {
              this.setState({ selectedTracks: tracks });
            }}
          >
            Select All
          </button>
          <button
            onClick={() => {
              playTracks(selectedTracks);
            }}
          >
            Play selected
          </button>
        </div>
      </div>
    );
  }
}

export default TrackView;
