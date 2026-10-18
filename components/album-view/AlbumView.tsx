import { PureComponent } from 'react';
import _ from 'lodash';
import type { Album, Track } from '../../types/library';
import style from './AlbumView.scss';
import AlbumViewThumbnail from '../album-view-thumbnail';

interface AlbumViewProps {
  loaded: boolean;
  albums: Album[];
  playTracks: (tracks: Track[]) => void;
  selectAlbum: (album: Album | null) => void;
}

class AlbumView extends PureComponent<AlbumViewProps> {
  private separator: HTMLDivElement | null = null;
  private listing: HTMLDivElement | null = null;

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

  render() {
    const { playTracks, selectAlbum, loaded, albums } = this.props;
    return (
      <div className={style.albums}>
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
          {loaded && albums.map((album) => <AlbumViewThumbnail key={album.id} album={album} selectAlbum={selectAlbum} playTracks={playTracks} />)}
        </div>
      </div>
    );
  }
}

export default AlbumView;
