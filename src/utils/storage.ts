import type { Track, Playlist, UserProfile } from '../types/music';

const STORAGE_KEYS = {
  LIKED_TRACKS: 'melodix_liked_tracks',
  HISTORY: 'melodix_playback_history',
  PLAYLISTS: 'melodix_user_playlists',
  SEARCH_HISTORY: 'melodix_search_history',
  VOLUME: 'melodix_volume',
  AUTOPLAY: 'melodix_autoplay_mode',
  GEMINI_KEY: 'melodix_gemini_api_key',
  USER_PROFILE: 'melodix_user_profile',
};

const DEFAULT_COVERS = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
];

export const storage = {
  getLikedTracks(): Track[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LIKED_TRACKS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveLikedTracks(tracks: Track[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LIKED_TRACKS, JSON.stringify(tracks));
    } catch (e) {
      console.warn('Failed to save liked tracks to localStorage', e);
    }
  },

  getHistory(): Track[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveHistory(tracks: Track[]): void {
    try {
      const trimmed = tracks.slice(0, 50);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Failed to save history to localStorage', e);
    }
  },

  getSearchHistory(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
      return data ? JSON.parse(data) : ['Arijit Singh', 'Majboor Sheheryar Rehan', 'Jhol Maanu', 'Trending Phonk'];
    } catch {
      return [];
    }
  },

  saveSearchHistory(queries: string[]): void {
    try {
      const trimmed = queries.slice(0, 30);
      localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Failed to save search history', e);
    }
  },

  addSearchQuery(query: string): void {
    const q = query.trim();
    if (!q) return;
    const history = this.getSearchHistory().filter((item) => item.toLowerCase() !== q.toLowerCase());
    const updated = [q, ...history];
    this.saveSearchHistory(updated);
  },

  clearSearchHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
    } catch (e) {
      console.warn('Failed to clear search history', e);
    }
  },

  getUserPlaylists(): Playlist[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveUserPlaylists(playlists: Playlist[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    } catch (e) {
      console.warn('Failed to save user playlists to localStorage', e);
    }
  },

  savePlaylist(playlist: Playlist): void {
    const playlists = this.getUserPlaylists();
    const existingIdx = playlists.findIndex(p => p.id === playlist.id);
    if (existingIdx >= 0) {
      playlists[existingIdx] = playlist;
    } else {
      playlists.unshift(playlist);
    }
    this.saveUserPlaylists(playlists);
  },

  createPlaylist(
    title: string,
    description: string = '',
    isPrivate: boolean = false,
    coverUrl?: string
  ): Playlist {
    const playlists = this.getUserPlaylists();
    const randomCover = DEFAULT_COVERS[Math.floor(Math.random() * DEFAULT_COVERS.length)];
    
    const newPlaylist: Playlist = {
      id: `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim() || 'My Playlist',
      description: description.trim() || (isPrivate ? 'Private collection' : 'Public collection'),
      cover: coverUrl?.trim() || randomCover,
      trackCount: 0,
      tags: [isPrivate ? 'Private' : 'Public', 'Custom Playlist'],
      type: 'user',
      isPrivate,
      tracks: [],
      createdAt: new Date().toISOString(),
    };

    const updated = [newPlaylist, ...playlists];
    this.saveUserPlaylists(updated);
    return newPlaylist;
  },

  addTrackToPlaylist(playlistId: string, track: Track): boolean {
    const playlists = this.getUserPlaylists();
    const idx = playlists.findIndex((p) => p.id === playlistId);
    if (idx === -1) return false;

    const target = playlists[idx];
    const currentTracks = target.tracks || [];

    if (currentTracks.some((t) => t.id === track.id)) {
      return false;
    }

    const updatedTracks = [track, ...currentTracks];
    playlists[idx] = {
      ...target,
      tracks: updatedTracks,
      trackCount: updatedTracks.length,
      cover: currentTracks.length === 0 ? track.artwork : target.cover,
    };

    this.saveUserPlaylists(playlists);
    return true;
  },

  removeTrackFromPlaylist(playlistId: string, trackId: string): void {
    const playlists = this.getUserPlaylists();
    const idx = playlists.findIndex((p) => p.id === playlistId);
    if (idx === -1) return;

    const target = playlists[idx];
    const updatedTracks = (target.tracks || []).filter((t) => t.id !== trackId);

    playlists[idx] = {
      ...target,
      tracks: updatedTracks,
      trackCount: updatedTracks.length,
    };

    this.saveUserPlaylists(playlists);
  },

  deletePlaylist(playlistId: string): void {
    const playlists = this.getUserPlaylists().filter((p) => p.id !== playlistId);
    this.saveUserPlaylists(playlists);
  },

  getAutoplay(): boolean {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.AUTOPLAY);
      return val !== null ? JSON.parse(val) : true;
    } catch {
      return true;
    }
  },

  saveAutoplay(enabled: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTOPLAY, JSON.stringify(enabled));
    } catch (e) {
      console.warn('Failed to save autoplay mode', e);
    }
  },

  getVolume(defaultVol: number = 1.0): number {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.VOLUME);
      return val !== null ? parseFloat(val) : defaultVol;
    } catch {
      return defaultVol;
    }
  },

  saveVolume(vol: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.VOLUME, vol.toString());
    } catch (e) {
      console.warn('Failed to save volume', e);
    }
  },

  getGeminiApiKey(): string {
    try {
      return localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || '';
    } catch {
      return '';
    }
  },

  saveGeminiApiKey(key: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, key.trim());
    } catch (e) {
      console.warn('Failed to save Gemini key', e);
    }
  },

  getUserProfile(): UserProfile | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveUserProfile(profile: UserProfile | null): void {
    try {
      if (profile) {
        localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
      }
    } catch (e) {
      console.warn('Failed to save user profile', e);
    }
  },

  getPlaybackState(): { track: Track | null, progress: number, queue: Track[] } {
    try {
      const data = localStorage.getItem('melodix_playback_state');
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load playback state', e);
    }
    return { track: null, progress: 0, queue: [] };
  },

  savePlaybackState(state: { track: Track | null, progress: number, queue: Track[] }): void {
    try {
      localStorage.setItem('melodix_playback_state', JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save playback state', e);
    }
  },

  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem('melodix_app_settings');
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
    return { ...DEFAULT_SETTINGS };
  },

  saveSettings(settings: Partial<AppSettings>): AppSettings {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem('melodix_app_settings', JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn('Failed to save settings', e);
      return { ...DEFAULT_SETTINGS, ...settings };
    }
  }
};

export interface AppSettings {
  audioQuality: string;
  crossfade: string;
  gapless: boolean;
  audioNormalization: boolean;
  autoplay: boolean;
  equalizerPreset: string;
  monoAudio: boolean;
  spatialAudio: string;
  theme: string;
  accentColor: string;
  dynamicBackgrounds: boolean;
  compactLibrary: boolean;
  uiAnimations: boolean;
  showLyricsBackground: boolean;
  language: string;
  dataSaver: boolean;
  cacheStreams: boolean;
  imageQuality: string;
  preloadNext: boolean;
  privateSession: boolean;
  explicitFilter: boolean;
  connectLastFm: boolean;
  publicPlaylists: boolean;
  pushNotifications: boolean;
  emailUpdates: boolean;
  hardwareAcceleration: boolean;
  mediaKeys: boolean;
  sleepTimer: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  audioQuality: '320kbps (High)',
  crossfade: 'Off',
  gapless: true,
  audioNormalization: true,
  autoplay: true,
  equalizerPreset: 'Flat',
  monoAudio: false,
  spatialAudio: 'Disabled',
  theme: 'Dark (Default)',
  accentColor: 'Emerald',
  dynamicBackgrounds: true,
  compactLibrary: false,
  uiAnimations: true,
  showLyricsBackground: true,
  language: 'English',
  dataSaver: false,
  cacheStreams: true,
  imageQuality: 'High (1080p)',
  preloadNext: true,
  privateSession: false,
  explicitFilter: true,
  connectLastFm: false,
  publicPlaylists: true,
  pushNotifications: false,
  emailUpdates: false,
  hardwareAcceleration: true,
  mediaKeys: true,
  sleepTimer: 'Off',
};
