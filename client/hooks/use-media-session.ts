import { useEffect } from 'react';

interface MediaSessionInfo {
  title: string;
  artist: string;
  album: string;
  cover: string | undefined;
}

/** Tells the OS media controls what plays */
export const useMediaSession = (info: MediaSessionInfo | undefined) => {
  useEffect(() => {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;

    navigator.mediaSession.metadata = info
      ? new MediaMetadata({ title: info.title, artist: info.artist, album: info.album, artwork: info.cover ? [{ src: info.cover }] : [] })
      : null;
  }, [info?.title, info?.artist, info?.album, info?.cover]);
};
