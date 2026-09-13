import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import type { Track, RepeatMode, UserProfile } from '../types/music';
import { storage, type AppSettings } from '../utils/storage';
import { BackgroundYouTubeEngine, stopYouTubeAudio } from '../components/player/BackgroundYouTubeEngine';
import { searchSaavnSongs } from '../services/saavnApi';
import { searchYouTubeTracks, getYouTubeStreamUrl } from '../services/youtubeApi';
import { getNextRecommendedTrack, isJunkTrack } from '../services/recommendationEngine';
import { FEATURED_HERO_TRACK, INITIAL_POPULAR_TRACKS } from '../services/curatedData';
import { firebaseAuth } from '../services/firebaseAuth';
import { AuthModal } from '../components/auth/AuthModal';
import { useMediaSession } from '../hooks/useMediaSession';
import { useToast } from './ToastContext';
import { updateDocumentPiPState } from '../utils/pipManager';

interface AudioContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queue: Track[];
  queueIndex: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  history: Track[];
  likedTracks: Track[];
  downloadedTracks: Track[];
  isLyricsOpen: boolean;
  isQueueOpen: boolean;
  isVideoOpen: boolean;
  isExpandedPlayerOpen: boolean;
  autoplay: boolean;
  isDjMode: boolean;
  user: UserProfile | null;
  isAuthModalOpen: boolean;
  setIsExpandedPlayerOpen: (open: boolean) => void;
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;

  playTrack: (track: Track, customQueue?: Track[]) => void;
  addDownloadedTrack: (track: Track) => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  toggleLike: (track: Track) => void;
  toggleLyrics: () => void;
  toggleQueue: () => void;
  toggleVideo: () => void;
  toggleAutoplay: () => void;
  toggleDjMode: () => void;
  toggleAiEnhancer: () => void;
  isLiked: (trackId: string) => boolean;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setIsLyricsOpen: (open: boolean) => void;
  setIsQueueOpen: (open: boolean) => void;
  setIsVideoOpen: (open: boolean) => void;
  setIsExpandedPlayerOpen: (open: boolean) => void;
  openAuthModal: (promptMessage?: string) => void;
  closeAuthModal: () => void;
  downloadModalTrack: Track | null;
  openDownloadModal: (track: Track) => void;
  closeDownloadModal: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const initialPlayback = storage.getPlaybackState();
  // Only restore previous track if user had one from a real session; never force Kesariya for first-time guests
  const initTrack = initialPlayback.track || null;
  const initQueue = initialPlayback.queue.length > 0 ? initialPlayback.queue : INITIAL_POPULAR_TRACKS;
  const initProgress = initialPlayback.progress || 0;

  const [currentTrack, setCurrentTrack] = useState<Track | null>(initTrack);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(initProgress);
  const [duration, setDuration] = useState<number>(initTrack?.duration || 0);
  const [volume, setVolumeState] = useState<number>(() => storage.getVolume());
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [user, setUser] = useState<UserProfile | null>(() => storage.getUserProfile());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authPromptMessage, setAuthPromptMessage] = useState<string>('');

  const [queue, setQueue] = useState<Track[]>(initQueue);
  const [originalQueue, setOriginalQueue] = useState<Track[]>(initQueue);
  const [queueIndex, setQueueIndex] = useState<number>(0);

  const [shuffle, setShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [autoplay, setAutoplayState] = useState<boolean>(() => storage.getAutoplay());
  const [isDjMode, setIsDjMode] = useState<boolean>(false);

  const [likedTracks, setLikedTracks] = useState<Track[]>(() => storage.getLikedTracks());
  const [history, setHistory] = useState<Track[]>(() => storage.getHistory().filter(t => !isJunkTrack(t)));
  const [downloadedTracks, setDownloadedTracks] = useState<Track[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('melodix_downloads') || '[]');
    } catch {
      return [];
    }
  });

  const addDownloadedTrack = useCallback((track: Track) => {
    setDownloadedTracks((prev) => {
      if (prev.some((t) => t.id === track.id)) return prev;
      const updated = [track, ...prev];
      try {
        localStorage.setItem('melodix_downloads', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const [isLyricsOpen, setIsLyricsOpen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isVideoOpen, setIsVideoOpen] = useState<boolean>(false);
  const [isExpandedPlayerOpen, setIsExpandedPlayerOpen] = useState<boolean>(false);
  const [downloadModalTrack, setDownloadModalTrack] = useState<Track | null>(null);

  const openDownloadModal = useCallback((track: Track) => {
    setDownloadModalTrack(track);
  }, []);

  const closeDownloadModal = useCallback(() => {
    setDownloadModalTrack(null);
  }, []);

  const [ytSeekTarget, setYtSeekTarget] = useState<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const playedTrackIdsRef = useRef<Set<string>>(new Set([FEATURED_HERO_TRACK.id]));

  const [isAiEnhancerEnabled, setIsAiEnhancerEnabled] = useState<boolean>(false);

  // App Settings State & Persistence
  const [settings, setSettingsState] = useState<AppSettings>(() => storage.getSettings());

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettingsState((prev) => {
      const updated = { ...prev, [key]: value };
      storage.saveSettings(updated);
      return updated;
    });

    if (key === 'autoplay') {
      setAutoplayState(Boolean(value));
      storage.saveAutoplay(Boolean(value));
    }
  }, []);

  // Sync Hardware Media Keys via MediaSession API
  useMediaSession({
    currentTrack,
    isPlaying,
    duration,
    currentTime,
    enabled: settings.mediaKeys,
    onPlay: () => {
      if (audioElementRef.current && currentTrack) {
        audioElementRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    },
    onPause: () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        setIsPlaying(false);
      }
      stopYouTubeAudio();
    },
    onNext: () => playNext(),
    onPrevious: () => playPrevious(),
    onSeek: (sec) => seekTo(sec),
  });

  // Sleep Timer Management
  const sleepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (sleepTimeoutRef.current) {
      clearTimeout(sleepTimeoutRef.current);
      sleepTimeoutRef.current = null;
    }

    if (settings.sleepTimer && settings.sleepTimer !== 'Off') {
      const minutes = parseInt(settings.sleepTimer, 10);
      if (!isNaN(minutes) && minutes > 0) {
        const ms = minutes * 60 * 1000;
        sleepTimeoutRef.current = setTimeout(() => {
          if (audioElementRef.current) {
            audioElementRef.current.pause();
          }
          stopYouTubeAudio();
          setIsPlaying(false);
          updateSetting('sleepTimer', 'Off');
          showToast(`Sleep timer reached (${minutes} mins). Music paused.`, 'info');
        }, ms);
      }
    }

    return () => {
      if (sleepTimeoutRef.current) {
        clearTimeout(sleepTimeoutRef.current);
      }
    };
  }, [settings.sleepTimer, showToast, updateSetting]);

  // Sync Document Attributes for Themes, Accents, and UI Modes
  useEffect(() => {
    // Theme Mode
    let themeMode = 'dark';
    if (settings.theme === 'Light') themeMode = 'light';
    else if (settings.theme === 'System Match') {
      themeMode = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', themeMode);

    // Accent Color (Emerald, Purple, Blue, Rose)
    document.documentElement.setAttribute('data-accent', (settings.accentColor || 'Emerald').toLowerCase());

    // Dynamic Backgrounds
    document.documentElement.setAttribute('data-dynamic-bg', String(settings.dynamicBackgrounds));

    // Compact Library View
    document.documentElement.setAttribute('data-compact', String(settings.compactLibrary));

    // UI Animations
    document.documentElement.setAttribute('data-animations', String(settings.uiAnimations));
    if (!settings.uiAnimations) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }

    // Hardware Acceleration
    document.documentElement.setAttribute('data-hw-accel', String(settings.hardwareAcceleration));
  }, [
    settings.theme, 
    settings.accentColor, 
    settings.dynamicBackgrounds, 
    settings.compactLibrary, 
    settings.uiAnimations, 
    settings.hardwareAcceleration
  ]);

  // Preload Next Track in Queue
  useEffect(() => {
    if (!settings.preloadNext) return;
    const nextTrack = queue[queueIndex + 1];
    if (nextTrack?.audioUrl) {
      const preloader = new Audio();
      preloader.preload = 'auto';
      preloader.src = nextTrack.audioUrl;
    }
  }, [queue, queueIndex, settings.preloadNext]);

  // Sync Auth User
  useEffect(() => {
    const unsub = firebaseAuth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        setLikedTracks(storage.getLikedTracks());
        setHistory(storage.getHistory());
      }
    });
    return () => unsub();
  }, []);

  // Equalizer Presets Specification
  const EQ_PRESETS: Record<string, { bass: number; mid: number; treble: number }> = {
    'Flat': { bass: 0, mid: 0, treble: 0 },
    'Bass Boost': { bass: 9, mid: 0, treble: -1 },
    'Acoustic': { bass: 2, mid: 3, treble: 6 },
    'Electronic': { bass: 8, mid: -1, treble: 6 },
    'Pop': { bass: 3, mid: 4, treble: 4 },
    'Rock': { bass: 5, mid: -2, treble: 6 },
  };

  // Web Audio API Setup: 3-Band Parametric Equalizer, Normalizer Compressor, Mono Downmixer
  const webAudioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const eqBassRef = useRef<BiquadFilterNode | null>(null);
  const eqMidRef = useRef<BiquadFilterNode | null>(null);
  const eqTrebleRef = useRef<BiquadFilterNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const monoMixerRef = useRef<GainNode | null>(null);
  const stereoPassRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!audioElementRef.current) return;
    
    if (!webAudioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      webAudioCtxRef.current = new AudioCtx();
      
      const audio = audioElementRef.current;
      audio.crossOrigin = "anonymous";
      sourceNodeRef.current = webAudioCtxRef.current.createMediaElementSource(audio);
      
      // Low Shelf Filter (Bass)
      eqBassRef.current = webAudioCtxRef.current.createBiquadFilter();
      eqBassRef.current.type = 'lowshelf';
      eqBassRef.current.frequency.value = 150;
      eqBassRef.current.gain.value = 0;

      // Peaking Filter (Midrange)
      eqMidRef.current = webAudioCtxRef.current.createBiquadFilter();
      eqMidRef.current.type = 'peaking';
      eqMidRef.current.frequency.value = 1000;
      eqMidRef.current.Q.value = 1.0;
      eqMidRef.current.gain.value = 0;

      // High Shelf Filter (Treble / Clarity)
      eqTrebleRef.current = webAudioCtxRef.current.createBiquadFilter();
      eqTrebleRef.current.type = 'highshelf';
      eqTrebleRef.current.frequency.value = 4500;
      eqTrebleRef.current.gain.value = 0;

      // Dynamics Compressor (Audio Normalization)
      compressorRef.current = webAudioCtxRef.current.createDynamicsCompressor();
      compressorRef.current.threshold.value = -24;
      compressorRef.current.knee.value = 30;
      compressorRef.current.ratio.value = 4;
      compressorRef.current.attack.value = 0.003;
      compressorRef.current.release.value = 0.25;

      // Mono Downmixer Node (accessibility)
      monoMixerRef.current = webAudioCtxRef.current.createGain();
      monoMixerRef.current.channelCount = 1;
      monoMixerRef.current.channelCountMode = 'explicit';
      monoMixerRef.current.channelInterpretation = 'speakers';

      // Stereo Pass Node
      stereoPassRef.current = webAudioCtxRef.current.createGain();

      // Connect standard processing chain:
      // Source -> Bass EQ -> Mid EQ -> Treble EQ -> Compressor
      sourceNodeRef.current.connect(eqBassRef.current);
      eqBassRef.current.connect(eqMidRef.current);
      eqMidRef.current.connect(eqTrebleRef.current);
      eqTrebleRef.current.connect(compressorRef.current);
      compressorRef.current.connect(stereoPassRef.current);
      stereoPassRef.current.connect(webAudioCtxRef.current.destination);
    }
  }, []);

  // Update Equalizer, Normalizer Compressor, and Mono Audio in Real-Time
  useEffect(() => {
    if (
      !webAudioCtxRef.current || 
      !compressorRef.current || 
      !eqBassRef.current || 
      !eqMidRef.current || 
      !eqTrebleRef.current ||
      !monoMixerRef.current ||
      !stereoPassRef.current
    ) return;

    const ctx = webAudioCtxRef.current;
    const now = ctx.currentTime;

    // 1. Apply Equalizer Preset + AI Enhancer
    const preset = EQ_PRESETS[settings.equalizerPreset] || EQ_PRESETS['Flat'];
    const enhancerBass = isAiEnhancerEnabled ? 3 : 0;
    const enhancerTreble = isAiEnhancerEnabled ? 4 : 0;

    eqBassRef.current.gain.setTargetAtTime(preset.bass + enhancerBass, now, 0.05);
    eqMidRef.current.gain.setTargetAtTime(preset.mid, now, 0.05);
    eqTrebleRef.current.gain.setTargetAtTime(preset.treble + enhancerTreble, now, 0.05);

    // 2. Apply Audio Normalization
    if (settings.audioNormalization) {
      compressorRef.current.threshold.setTargetAtTime(-24, now, 0.05);
      compressorRef.current.ratio.setTargetAtTime(6, now, 0.05);
    } else {
      compressorRef.current.threshold.setTargetAtTime(0, now, 0.05);
      compressorRef.current.ratio.setTargetAtTime(1, now, 0.05);
    }

    // 3. Apply Mono Audio downmix or Stereo pass
    try {
      compressorRef.current.disconnect();
      monoMixerRef.current.disconnect();
      stereoPassRef.current.disconnect();

      if (settings.monoAudio) {
        compressorRef.current.connect(monoMixerRef.current);
        monoMixerRef.current.connect(ctx.destination);
      } else {
        compressorRef.current.connect(stereoPassRef.current);
        stereoPassRef.current.connect(ctx.destination);
      }
    } catch (e) {
      console.warn('Audio graph reconfiguration error:', e);
    }
    
    // Ensure context is running
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  }, [
    settings.equalizerPreset, 
    settings.audioNormalization, 
    settings.monoAudio, 
    isAiEnhancerEnabled
  ]);

  // Restore audio src on mount
  useEffect(() => {
    if (audioElementRef.current && currentTrack?.audioUrl) {
      audioElementRef.current.src = currentTrack.audioUrl;
      audioElementRef.current.currentTime = currentTime; // restore progress
      audioElementRef.current.volume = isMuted ? 0 : volume;
    }
  }, []);

  // Save playback state periodically (debounced by time update)
  useEffect(() => {
    storage.savePlaybackState({
      track: currentTrack,
      progress: currentTime,
      queue: queue,
    });
  }, [currentTrack, currentTime, queue]);

  // Sync Volume
  useEffect(() => {
    if (audioElementRef.current) {
      audioElementRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Sync Always-On-Top Picture-in-Picture Mini-Player
  useEffect(() => {
    updateDocumentPiPState(currentTrack, isPlaying, currentTime, duration);
  }, [currentTrack, isPlaying, currentTime, duration]);

  // Cross-Tab Playback Synchronization & Tab-Close Cleanup
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const tabId = Math.random().toString(36).slice(2);
    window.__melodixTabId = tabId;
    const channel = new BroadcastChannel('melodix_playback_sync');

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'EXCLUSIVE_PLAY' && e.data?.tabId !== tabId) {
        // Another Melodix tab started playing! Pause audio immediately in this tab!
        if (audioElementRef.current) {
          audioElementRef.current.pause();
        }
        stopYouTubeAudio();
        setIsPlaying(false);
      }
    };

    channel.addEventListener('message', handleMessage);

    // Stop audio immediately when user closes or reloads the tab
    const handleBeforeUnload = () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      stopYouTubeAudio();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Broadcast when this tab starts playing to pause all other tabs
  useEffect(() => {
    if (isPlaying && typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('melodix_playback_sync');
        channel.postMessage({ type: 'EXCLUSIVE_PLAY', tabId: window.__melodixTabId });
        channel.close();
      } catch {}
    }
  }, [isPlaying, currentTrack?.id]);

  const openAuthModal = useCallback((msg?: string) => {
    setAuthPromptMessage(msg || '');
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    sessionStorage.setItem('melodix_guest_dismissed', 'true');
    setIsAuthModalOpen(false);
  }, []);

  // Set Volume
  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (audioElementRef.current) {
      audioElementRef.current.volume = isMuted ? 0 : clamped;
    }
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
    storage.saveVolume(clamped);
  }, [isMuted]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      if (audioElementRef.current) audioElementRef.current.volume = volume;
    } else {
      setIsMuted(true);
      if (audioElementRef.current) audioElementRef.current.volume = 0;
    }
  }, [isMuted, volume]);

  // Seek
  const seekTo = useCallback((seconds: number) => {
    setCurrentTime(seconds);
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = seconds;
    }
    setYtSeekTarget(seconds);
  }, []);

  // Play Track with fast start & zero buffering
  const playTrack = useCallback(async (track: Track, customQueue?: Track[]) => {
    let effectiveTrack = { ...track };
    setCurrentTrack(effectiveTrack);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(effectiveTrack.duration || 210);

    playedTrackIdsRef.current.add(effectiveTrack.id);

    // Save to history & sync (only real verified music tracks, and skip if Private Session is active)
    if (!settings.privateSession && !isJunkTrack(effectiveTrack)) {
      setHistory((prevHistory) => {
        const filtered = prevHistory.filter((t) => t.id !== effectiveTrack.id && !isJunkTrack(t));
        const updated = [effectiveTrack, ...filtered].slice(0, 100);
        storage.saveHistory(updated);
        firebaseAuth.syncToCloud().catch(() => {});
        return updated;
      });
    }

    if (customQueue && customQueue.length > 0) {
      const idx = customQueue.findIndex((t) => t.id === effectiveTrack.id);
      setQueue(customQueue);
      setOriginalQueue(customQueue);
      setQueueIndex(idx !== -1 ? idx : 0);
    } else {
      setQueue((prevQueue) => {
        const existsIdx = prevQueue.findIndex((t) => t.id === effectiveTrack.id);
        if (existsIdx !== -1) {
          setQueueIndex(existsIdx);
          return prevQueue;
        } else {
          // If playing a standalone track (like from search), make it the only track
          // so that AI Autoplay kicks in after it finishes, rather than playing old queue.
          setQueueIndex(0);
          const newQ = [effectiveTrack];
          setOriginalQueue(newQ);
          return newQ;
        }
      });
    }

    // Adapt bitrate if JioSaavn stream URL is available
    const adaptQualityUrl = (url: string): string => {
      if (!url) return url;
      if (settings.audioQuality === '96kbps (Data Saver)' || settings.dataSaver) {
        return url.replace(/_(320|160)\.(mp4|m4a|mp3)/i, '_96.$2');
      } else if (settings.audioQuality === '160kbps (Normal)') {
        return url.replace(/_(320|96)\.(mp4|m4a|mp3)/i, '_160.$2');
      } else {
        return url.replace(/_(160|96)\.(mp4|m4a|mp3)/i, '_320.$2');
      }
    };

    // Smooth fade in if DJ mode is on
    const executePlay = (url: string) => {
      const tunedUrl = adaptQualityUrl(url);
      // Unconditionally stop any playing YouTube iframe to prevent audio overlap
      stopYouTubeAudio();

      if (!audioElementRef.current) return;
      audioElementRef.current.src = tunedUrl;
      audioElementRef.current.currentTime = 0;
      
      const startVol = isDjMode ? 0 : (isMuted ? 0 : volume);
      audioElementRef.current.volume = startVol;
      
      const p = audioElementRef.current.play();
      if (p !== undefined) {
        p.catch((err) => console.warn('Audio play error:', err));
      }

      if (isDjMode && !isMuted && volume > 0) {
        let currentVol = 0;
        const fadeInterval = setInterval(() => {
          currentVol = Math.min(volume, currentVol + (volume / 20)); // Fade over 2 seconds
          if (audioElementRef.current) {
            audioElementRef.current.volume = currentVol;
          }
          if (currentVol >= volume) clearInterval(fadeInterval);
        }, 100);
      }
    };

    // 1. Direct MP3 Stream Execution (Saavn tracks / cached streams)
    if (effectiveTrack.audioUrl && audioElementRef.current) {
      executePlay(effectiveTrack.audioUrl);
      return;
    }

    // 2. YouTube track (no direct audioUrl): Start iframe engine IMMEDIATELY — no waiting.
    //    The iframe engine reliably starts in ~2-4 seconds.
    //    Fetch InnerTube stream URL silently in the background and cache it for next play.
    if (effectiveTrack.youtubeVideoId) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
      setCurrentTrack(effectiveTrack);
      setIsPlaying(true);

      // Background: silently fetch + cache InnerTube stream URL (no await — non-blocking)
      fetch(`/.netlify/functions/stream?id=${effectiveTrack.youtubeVideoId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          // Just cache it — will be used next time user plays this track
          if (data?.url) {
            // Store in sessionStorage keyed by video ID for quick retrieval
            try {
              sessionStorage.setItem(`yt_stream_${effectiveTrack.youtubeVideoId}`, data.url);
            } catch {}
          }
        })
        .catch(() => {}); // Silently ignore failures

      return;
    }

    // 3. Non-YouTube track without audioUrl: Try Saavn as fallback
    try {
      const cleanTitle = (effectiveTrack.title || '')
        .split('|')[0]
        .split(' - ')[0]
        .replace(/\(.*?\)|\[.*?\]/gi, '')
        .replace(/official (music )?video|official audio|lyric(s)? (video)?|audio|visualizer/gi, '')
        .trim();
      const cleanArtist = (effectiveTrack.artist || '').split(/[,&x/|]/)[0].trim();
      const query = `${cleanTitle} ${cleanArtist}`.trim();

      const saavnResults = await searchSaavnSongs(query || cleanTitle, 1);
      if (saavnResults && saavnResults.length > 0 && saavnResults[0].audioUrl && audioElementRef.current) {
        effectiveTrack = {
          ...effectiveTrack,
          audioUrl: saavnResults[0].audioUrl,
          rawSaavnId: saavnResults[0].rawSaavnId,
        };
        setCurrentTrack(effectiveTrack);
        executePlay(saavnResults[0].audioUrl);
        return;
      }
    } catch (err) {
      console.warn('Saavn stream resolver error:', err);
    }
  }, [volume, isMuted, isDjMode, settings.privateSession, settings.audioQuality, settings.dataSaver]);

  // Play Next
  const playNext = useCallback(async () => {
    if (queue.length === 0) return;

    const nextIndex = queueIndex + 1;
    if (nextIndex < queue.length) {
      setQueueIndex(nextIndex);
      const nextTrack = queue[nextIndex];
      if (nextTrack) {
        playTrack(nextTrack);
        return;
      }
    }

    if (repeatMode === 'all') {
      setQueueIndex(0);
      const firstTrack = queue[0];
      if (firstTrack) {
        playTrack(firstTrack);
      }
      return;
    }

    // Smart AI Autoplay recommendation
    if (autoplay && currentTrack) {
      try {
        const nextAiTrack = await getNextRecommendedTrack(currentTrack, playedTrackIdsRef.current);
        if (nextAiTrack) {
          setQueue((prev) => [...prev, nextAiTrack]);
          setQueueIndex(queue.length);
          playTrack(nextAiTrack);
          return;
        }
      } catch (e) {
        console.warn('Autoplay recommendation error:', e);
      }
    }

    setIsPlaying(false);
  }, [queue, queueIndex, repeatMode, autoplay, currentTrack, playTrack]);

  // Play Previous
  const playPrevious = useCallback(() => {
    if (queue.length === 0) return;

    if (currentTime > 3) {
      seekTo(0);
      return;
    }

    const prevIndex = queueIndex - 1;
    if (prevIndex >= 0) {
      setQueueIndex(prevIndex);
      const prevTrack = queue[prevIndex];
      if (prevTrack) {
        playTrack(prevTrack);
      }
    } else {
      seekTo(0);
    }
  }, [queue, queueIndex, currentTime, seekTo, playTrack]);

  // Toggle Play / Pause
  const togglePlayPause = useCallback(() => {
    if (!currentTrack) {
      if (queue.length > 0) {
        playTrack(queue[0]);
      }
      return;
    }

    if (isPlaying) {
      setIsPlaying(false);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      stopYouTubeAudio();
    } else {
      setIsPlaying(true);
      if (audioElementRef.current && currentTrack.audioUrl) {
        audioElementRef.current.play().catch((err) => console.warn('Resume play error:', err));
      }
    }
  }, [isPlaying, currentTrack, queue, playTrack]);

  // Toggle Shuffle
  const toggleShuffle = useCallback(() => {
    const newShuffle = !shuffle;
    setShuffle(newShuffle);

    if (newShuffle) {
      if (!currentTrack) return;
      const remainingTracks = originalQueue.filter((t) => t.id !== currentTrack.id);
      for (let i = remainingTracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingTracks[i], remainingTracks[j]] = [remainingTracks[j], remainingTracks[i]];
      }
      const shuffledQueue = [currentTrack, ...remainingTracks];
      setQueue(shuffledQueue);
      setQueueIndex(0);
    } else {
      if (!currentTrack) return;
      setQueue(originalQueue);
      const originalIdx = originalQueue.findIndex((t) => t.id === currentTrack.id);
      setQueueIndex(originalIdx !== -1 ? originalIdx : 0);
    }
  }, [shuffle, currentTrack, originalQueue]);

  // Cycle Repeat Mode (off -> all -> one -> off)
  const cycleRepeatMode = useCallback(() => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const nextIdx = (modes.indexOf(repeatMode) + 1) % modes.length;
    setRepeatMode(modes[nextIdx]);
  }, [repeatMode]);

  // Toggle Autoplay
  const toggleAutoplay = useCallback(() => {
    setAutoplayState((prev) => {
      const next = !prev;
      storage.saveAutoplay(next);
      return next;
    });
  }, []);

  const djModeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggleDjMode = useCallback(() => {
    // Debounce: ignore subsequent clicks within 800ms
    if (djModeDebounceRef.current) return;
    djModeDebounceRef.current = setTimeout(() => {
      djModeDebounceRef.current = null;
    }, 800);

    setIsDjMode((prev) => {
      const next = !prev;
      if (next && !autoplay) {
        setAutoplayState(true);
        storage.saveAutoplay(true);
      }
      if (next) {
        showToast('AI DJ Mode Enabled 🎧 — Continuous mix started!', 'success');
      } else {
        showToast('AI DJ Mode Off', 'info');
      }
      return next;
    });
  }, [autoplay, showToast]);

  // Like Song
  const toggleLike = useCallback((track: Track) => {
    if (!user) {
      openAuthModal('Sign in with Google or Email to save tracks to your Liked Songs!');
      return;
    }

    setLikedTracks((prev) => {
      const isAlreadyLiked = prev.some((t) => t.id === track.id);
      let updated: Track[];
      if (isAlreadyLiked) {
        updated = prev.filter((t) => t.id !== track.id);
        showToast(`Removed "${track.title}" from Liked Songs`);
      } else {
        updated = [track, ...prev];
        showToast(`Added "${track.title}" to Liked Songs`);
      }
      storage.saveLikedTracks(updated);
      firebaseAuth.syncToCloud().catch(() => {});
      return updated;
    });
  }, [user, openAuthModal]);

  const isLiked = useCallback((trackId: string): boolean => {
    if (!user) return false;
    return likedTracks.some((t) => t.id === trackId);
  }, [likedTracks, user]);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track]);
    setOriginalQueue((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  }, []);

  const clearQueue = useCallback(() => {
    if (currentTrack) {
      setQueue([currentTrack]);
      setOriginalQueue([currentTrack]);
      setQueueIndex(0);
    } else {
      setQueue([]);
      setOriginalQueue([]);
      setQueueIndex(0);
    }
  }, [currentTrack]);

  const handleTrackEnd = useCallback(() => {
    if (repeatMode === 'one') {
      seekTo(0);
      if (audioElementRef.current) {
        audioElementRef.current.play().catch(() => {});
      }
      return;
    }
    playNext();
  }, [repeatMode, seekTo, playNext]);

  const handleYouTubeTimeUpdate = useCallback((time: number, dur: number) => {
    setCurrentTime(time);
    if (dur > 0 && !isNaN(dur)) {
      setDuration(dur);
    }
  }, []);

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        queue,
        queueIndex,
        shuffle,
        repeatMode,
        history,
        likedTracks,
        downloadedTracks,
        isLyricsOpen,
        isQueueOpen,
        isVideoOpen,
        isExpandedPlayerOpen,
        autoplay,
        isDjMode,
        isAiEnhancerEnabled,
        settings,
        updateSetting,
        user,
        isAuthModalOpen,
        playTrack,
        addDownloadedTrack,
        togglePlayPause,
        seekTo,
        setVolume,
        toggleMute,
        playNext,
        playPrevious,
        toggleShuffle,
        cycleRepeatMode,
        toggleLike,
        isLiked,
        setIsLyricsOpen,
        setIsQueueOpen,
        setIsVideoOpen,
        setIsExpandedPlayerOpen,
        toggleAutoplay,
        toggleDjMode,
        toggleAiEnhancer: () => setIsAiEnhancerEnabled(prev => !prev),
        addToQueue,
        removeFromQueue,
        clearQueue,
        toggleLyrics: () => setIsLyricsOpen((p) => !p),
        toggleQueue: () => setIsQueueOpen((p) => !p),
        toggleVideo: () => setIsVideoOpen((p) => !p),
        openAuthModal,
        closeAuthModal,
        downloadModalTrack,
        openDownloadModal,
        closeDownloadModal,
      }}
    >
      {children}

      {/* Auth Modal for Login & Guest Protection */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        promptMessage={authPromptMessage}
      />

      {/* Persistent HTML5 Audio Element with high-bandwidth preloading */}
      <audio
        ref={audioElementRef}
        preload="auto"
        onTimeUpdate={() => {
          if (audioElementRef.current) {
            const cur = audioElementRef.current.currentTime;
            setCurrentTime(cur);
            if (!isNaN(audioElementRef.current.duration) && audioElementRef.current.duration > 0) {
              const dur = audioElementRef.current.duration;
              setDuration(dur);

              // Smooth Crossfade volume reduction near track end
              const crossfadeSec = settings.crossfade === '2s' ? 2 : settings.crossfade === '5s' ? 5 : settings.crossfade === '10s' ? 10 : 0;
              if (crossfadeSec > 0 && dur > crossfadeSec && (dur - cur) <= crossfadeSec) {
                const ratio = Math.max(0, (dur - cur) / crossfadeSec);
                audioElementRef.current.volume = Math.max(0, (isMuted ? 0 : volume) * ratio);
              }
            }
          }
        }}
        onLoadedMetadata={() => {
          if (audioElementRef.current) {
            if (!isNaN(audioElementRef.current.duration) && audioElementRef.current.duration > 0) {
              setDuration(audioElementRef.current.duration);
            }
            
            // Critical fix: Browsers reset currentTime to 0 on loadedmetadata.
            // If we have a saved currentTime that is greater than 1s, restore it now.
            if (currentTime > 1 && Math.abs(audioElementRef.current.currentTime - currentTime) > 2) {
              audioElementRef.current.currentTime = currentTime;
            }
          }
        }}
        onEnded={handleTrackEnd}
        onWaiting={() => {
          // Keep active during any transient network buffer
        }}
        onCanPlay={() => {
          if (isPlaying && audioElementRef.current && audioElementRef.current.paused) {
            audioElementRef.current.play().catch(() => {});
          }
        }}
      />

      {/* 100% Invisible Background YouTube Audio Engine for tracks without direct MP3 stream */}
      <BackgroundYouTubeEngine
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        volume={volume}
        isMuted={isMuted}
        seekTarget={ytSeekTarget}
        onTimeUpdate={(cur, dur) => {
          setCurrentTime(cur);
          if (dur > 0) setDuration(dur);
        }}
        onEnded={handleTrackEnd}
      />


    </AudioContext.Provider>
  );
};

export const useAudio = (): AudioContextType => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
