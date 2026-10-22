import type { Album, Folder, Track } from '../../types/library';

export type LibraryView = 'albums' | 'tracks' | 'folders';
export type OnlineView = 'shoutcast' | 'spotify';
export type Tab = 'now-playing' | 'local' | 'online-sources' | 'equalizer' | 'settings';

export interface PlaylistItem {
  file: string;
  title?: string;
}

/** The part of the UI state that is persisted between sessions */
export interface PersistedSettings {
  view: LibraryView;
  onlineView: OnlineView;
  tab: Tab;
  nowPlaying: Track[];
  played: Track[];
  currentSong: Track | null;
  currentTime: number;
  volume: number;
  selectedAlbum: Album | null;
  maximized: boolean;
  shuffle: boolean;
  repeat: boolean;
  equalizer: number[];
}

export interface UiState extends PersistedSettings {
  port: string;
  scanningFolder: string | null;
  progress: number;
  totalCount: number;
  isPlaying: boolean;
}

type EmptyPayload = Record<string, never>;

type EmptyAction<T extends string> = { type: T; payload?: EmptyPayload };
type PayloadAction<T extends string, P> = { type: T; payload: P };

export type AppAction =
  | { type: 'APP_INIT' }
  | EmptyAction<'APP_LOADED'>
  | EmptyAction<'CLOSE_APP'>
  | EmptyAction<'MINIMIZE_APP'>
  | EmptyAction<'MAXIMIZE_APP'>
  | EmptyAction<'SAVE_SETTINGS'>
  | EmptyAction<'RESCAN_LIBRARY'>
  | EmptyAction<'RESCAN_COMPLETE'>
  | EmptyAction<'TRACKS_ADDED_TO_LIBRARY'>
  | EmptyAction<'TRACK_ENDED'>
  | EmptyAction<'NEXT_SONG'>
  | EmptyAction<'PREVIOUS_SONG'>
  | EmptyAction<'TOGGLE_REPEAT'>
  | EmptyAction<'TOGGLE_SHUFFLE'>
  | EmptyAction<'CLEAR_PLAYED'>
  | EmptyAction<'POP_PLAYED'>
  | EmptyAction<'CLICK_NOTIFICATION'>
  | PayloadAction<'FOLDERS_ADDED_TO_LIBRARY', { folders: Folder[] }>
  | PayloadAction<'STORE_FOLDERS', { folders: Folder[] }>
  | PayloadAction<'STORE_LIBRARY', { library: Track[]; finished: boolean }>
  | PayloadAction<'FILES_ADDED', { fileList: FileList }>
  | PayloadAction<'CLICKED_URL', { playlist: PlaylistItem[]; url: string }>
  | PayloadAction<'RESTORE_SETTINGS', { settings: Partial<PersistedSettings> }>
  | PayloadAction<'SCANNING_FOLDER', { folder: string }>
  | PayloadAction<'SCANNING_FILE', { fileName: string; progress: number; totalCount: number }>
  | PayloadAction<'MAXIMIZED_APP', { maximized: boolean }>
  | PayloadAction<'SET_PLAYING', { isPlaying: boolean }>
  | PayloadAction<'SET_VIEW', { view: LibraryView }>
  | PayloadAction<'SET_ONLINE_VIEW', { view: OnlineView }>
  | PayloadAction<'SET_TAB', { tab: Tab }>
  | PayloadAction<'SET_VOLUME', { volume: number | string }>
  | PayloadAction<'SET_CURRENT_TIME', { currentTime: number | string }>
  | PayloadAction<'SET_GAIN', { value: number | string; index: number }>
  | PayloadAction<'SELECT_ALBUM', { album: Album | null }>
  | PayloadAction<'PLAY_TRACKS', { tracks: Track[] }>
  | PayloadAction<'PLAY_TRACK', { track: Track | null }>
  | PayloadAction<'FORCE_PLAY_TRACK', { track: Track }>
  | PayloadAction<'ADD_PLAYED', { track: Track | null }>;

export const isAppAction = (action: unknown): action is AppAction =>
  typeof action === 'object' && action !== null && 'type' in action && typeof action.type === 'string';
