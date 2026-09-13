import { useEffect } from 'react';
import type { Track } from '../types/music';

interface MediaSessionOptions {
  currentTrack: Track | null;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  enabled?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (seconds: number) => void;
}

export function useMediaSession({
  currentTrack,
  isPlaying,
  duration,
  currentTime,
  enabled = true,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
}: MediaSessionOptions) {
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (!enabled || !currentTrack) {
      // Clear handlers when disabled
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      } catch {}
      return;
    }

    // Update OS / Browser background metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album || 'Melodix Master HD',
      artwork: [
        { src: currentTrack.artwork, sizes: '96x96', type: 'image/jpeg' },
        { src: currentTrack.artwork, sizes: '128x128', type: 'image/jpeg' },
        { src: currentTrack.artwork, sizes: '256x256', type: 'image/jpeg' },
        { src: currentTrack.artwork, sizes: '512x512', type: 'image/jpeg' },
      ],
    });

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    // Hook background media control actions
    try {
      navigator.mediaSession.setActionHandler('play', onPlay);
      navigator.mediaSession.setActionHandler('pause', onPause);
      navigator.mediaSession.setActionHandler('nexttrack', onNext);
      navigator.mediaSession.setActionHandler('previoustrack', onPrevious);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          onSeek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        onSeek(Math.min(duration, currentTime + (details.seekOffset || 10)));
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        onSeek(Math.max(0, currentTime - (details.seekOffset || 10)));
      });
    } catch (e) {
      console.warn('MediaSession handler warning:', e);
    }
  }, [currentTrack, isPlaying]);

  // Update OS playback position
  useEffect(() => {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
    if (duration > 0 && !isNaN(duration) && currentTime >= 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(duration, 1),
          playbackRate: 1,
          position: Math.min(currentTime, duration),
        });
      } catch {}
    }
  }, [currentTime, duration]);
}
