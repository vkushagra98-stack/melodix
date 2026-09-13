import React, { useEffect, useRef } from 'react';
import type { Track } from '../../types/music';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    __melodixYtPlayer?: any;
    __melodixTabId?: string;
  }
}

export const stopYouTubeAudio = () => {
  try {
    const p = window.__melodixYtPlayer;
    if (p) {
      if (typeof p.pauseVideo === 'function') p.pauseVideo();
      if (typeof p.stopVideo === 'function') p.stopVideo();
    }
  } catch {}
};

interface BackgroundYouTubeEngineProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  seekTarget: number | null;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onEnded: () => void;
}

/**
 * Robust Background Audio Engine for YouTube tracks.
 * - Uses unmanaged DOM node outside React's virtual DOM diffing to prevent React from destroying the iframe.
 * - Sized at 200x200 with 0.001 opacity at bottom-right so Chromium autoplay & visibility scheduler treats it as active.
 * - Handles onReady race conditions with a pending queue.
 */
export const BackgroundYouTubeEngine: React.FC<BackgroundYouTubeEngineProps> = ({
  currentTrack,
  isPlaying,
  volume,
  isMuted,
  seekTarget,
  onTimeUpdate,
  onEnded,
}) => {
  const playerRef = useRef<any>(null);
  const isPlayerReadyRef = useRef<boolean>(false);
  const pendingVideoIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<any>(null);
  const currentVideoIdRef = useRef<string | null>(null);

  const isYtTrack = !currentTrack?.audioUrl && !!currentTrack?.youtubeVideoId;

  // 1. Create permanent DOM host & load YouTube API
  useEffect(() => {
    let host = document.getElementById('melodix-yt-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'melodix-yt-host';
      host.setAttribute('aria-hidden', 'true');
      host.style.position = 'fixed';
      host.style.top = '0px';
      host.style.left = '0px';
      host.style.width = '1px';
      host.style.height = '1px';
      host.style.opacity = '0.001';
      host.style.overflow = 'hidden';
      host.style.pointerEvents = 'none';
      host.style.zIndex = '-99999';

      const slot = document.createElement('div');
      slot.id = 'melodix-yt-iframe-slot';
      host.appendChild(slot);
      document.body.appendChild(host);
    }

    const initPlayer = () => {
      if (playerRef.current || !window.YT?.Player) return;
      const target = document.getElementById('melodix-yt-iframe-slot');
      if (!target) return;

      try {
        const player = new window.YT.Player('melodix-yt-iframe-slot', {
          height: '200',
          width: '200',
          videoId: '',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              isPlayerReadyRef.current = true;
              (window as any).__melodixYtPlayer = event.target;
              event.target.setVolume(isMuted ? 0 : Math.round(volume * 100));
              if (pendingVideoIdRef.current) {
                const vid = pendingVideoIdRef.current;
                pendingVideoIdRef.current = null;
                currentVideoIdRef.current = vid;
                event.target.loadVideoById(vid);
                event.target.playVideo();
              }
            },
            onStateChange: (event: any) => {
              if (event.data === 0) {
                onEnded();
              }
            },
            onError: (err: any) => {
              console.warn('[Background YT Engine Error]', err);
            },
          },
        });
        playerRef.current = player;
        (window as any).__melodixYtPlayer = player;
      } catch (e) {
        console.warn('[Background YT Engine Init Failed]', e);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const prevHandler = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevHandler) prevHandler();
        initPlayer();
      };

      if (!document.getElementById('melodix-yt-iframe-script')) {
        const tag = document.createElement('script');
        tag.id = 'melodix-yt-iframe-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // 2. Handle Track changes
  useEffect(() => {
    if (!isYtTrack) {
      if (isPlayerReadyRef.current && playerRef.current?.pauseVideo) {
        try {
          playerRef.current.pauseVideo();
        } catch {}
      }
      currentVideoIdRef.current = null;
      return;
    }

    const videoId = currentTrack?.youtubeVideoId;
    if (videoId && videoId !== currentVideoIdRef.current) {
      currentVideoIdRef.current = videoId;
      if (isPlayerReadyRef.current && playerRef.current?.loadVideoById) {
        try {
          playerRef.current.loadVideoById(videoId);
          if (isPlaying) {
            playerRef.current.playVideo();
          }
        } catch (err) {
          console.warn('Failed to load video in background YT player:', err);
        }
      } else {
        pendingVideoIdRef.current = videoId;
      }
    }
  }, [currentTrack?.id, currentTrack?.youtubeVideoId, isYtTrack, isPlaying]);

  // 3. Handle Play / Pause
  useEffect(() => {
    if (!isYtTrack || !isPlayerReadyRef.current || !playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.playVideo?.();
      } else {
        playerRef.current.pauseVideo?.();
      }
    } catch {}
  }, [isPlaying, isYtTrack]);

  // 4. Handle Volume / Mute
  useEffect(() => {
    if (!isPlayerReadyRef.current || !playerRef.current) return;
    try {
      const targetVol = isMuted ? 0 : Math.round(volume * 100);
      playerRef.current.setVolume?.(targetVol);
    } catch {}
  }, [volume, isMuted]);

  // 5. Handle Seek
  useEffect(() => {
    if (seekTarget !== null && isPlayerReadyRef.current && playerRef.current && isYtTrack) {
      try {
        playerRef.current.seekTo?.(seekTarget, true);
      } catch {}
    }
  }, [seekTarget, isYtTrack]);

  // 6. Time update polling (every 250ms)
  useEffect(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    if (isYtTrack && isPlaying) {
      pollIntervalRef.current = setInterval(() => {
        if (!playerRef.current || !isPlayerReadyRef.current) return;
        try {
          const cur = playerRef.current.getCurrentTime?.() || 0;
          const dur = playerRef.current.getDuration?.() || 0;
          if (dur > 0) {
            onTimeUpdate(cur, dur);
          }
        } catch {}
      }, 250);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isYtTrack, isPlaying, onTimeUpdate]);

  // Return null so React Virtual DOM diffing does NOT manage or destroy the player
  return null;
};
