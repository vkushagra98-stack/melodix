export type AudioSourceType = 'jiosaavn' | 'youtube';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  durationFormatted?: string;
  artwork: string;
  audioUrl?: string; // direct MP3 / AAC stream url
  youtubeVideoId?: string; // YouTube video ID
  source: AudioSourceType;
  quality?: string; // '320kbps MP3', 'HD Stream'
  year?: string;
  language?: string;
  hasLyrics?: boolean;
  rawSaavnId?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  cover: string;
  trackCount: number;
  tags: string[];
  type: 'curated' | 'user' | 'trending';
  category?: 'hindi' | 'english' | 'phonk' | 'classics' | 'lofi' | 'mix';
  tracks?: Track[];
  isPrivate?: boolean;
  author?: string;
  authorAvatar?: string;
  createdAt?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface LyricsData {
  lyrics: string;
  snippet?: string;
  copyright?: string;
  synced?: boolean;
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queue: Track[];
  queueIndex: number;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  history: Track[];
  likedTracks: Track[];
}

export interface SearchFilters {
  source: 'all' | 'jiosaavn' | 'youtube';
  query: string;
}
