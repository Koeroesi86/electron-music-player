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

    if (!info) {
      navigator.mediaSession.metadata = null;
      return;
    }

    const metadata = new MediaMetadata({ title: info.title, artist: info.artist, album: info.album });
    navigator.mediaSession.metadata = metadata;
    if (!info.cover) return;

    // an artwork can only be an http, https, data or blob address, so the cover of the emusic protocol goes in as a blob
    const controller = new AbortController();
    let objectUrl: string | undefined;

    fetch(info.cover, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`The cover answered ${response.status}`);

        return response.blob();
      })
      .then((blob) => {
        if (controller.signal.aborted) return;

        objectUrl = URL.createObjectURL(blob);
        metadata.artwork = [{ src: objectUrl }];
      })
      .catch(() => undefined); // the controls show the track without a cover

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [info?.title, info?.artist, info?.album, info?.cover]);
};
