import React, { useEffect, useRef, useState } from 'react';
import type { Track } from '../../types/music';
import { useAudio } from '../../context/AudioContext';
import { formatDuration } from '../../utils/formatters';
import { ChevronDown, ChevronUp, Sparkles, X, Disc3, Video } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface StudioPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  seekTarget: number | null;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onTrackEnded: () => void;
}

export const StudioPlayer: React.FC<StudioPlayerProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  seekTarget,
  onTimeUpdate,
  onTrackEnded,
}) => {
  const { isVideoOpen, setIsVideoOpen } = useAudio();
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const isYouTubeTrack = !currentTrack?.audioUrl && !!currentTrack?.youtubeVideoId;
  const playerRef = useRef<any>(null);
  const isApiLoadedRef = useRef<boolean>(false);
  const timePollInterval = useRef<any>(null);

  // 1. YouTube IFrame API Loader
  useEffect(() => {
    const setupYT = () => {
      if (window.YT && window.YT.Player) {
        isApiLoadedRef.current = true;
        initYTPlayer();
      }
    };

    if (window.YT && window.YT.Player) {
      setupYT();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        setupYT();
      };

      if (!document.getElementById('yt-iframe-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
    }

    return () => {
      if (timePollInterval.current) clearInterval(timePollInterval.current);
    };
  }, []);

  const initYTPlayer = () => {
    if (playerRef.current || !window.YT?.Player) return;

    try {
      playerRef.current = new window.YT.Player('melodix-studio-yt-canvas', {
        height: '100%',
        width: '100%',
        videoId: isYouTubeTrack ? currentTrack?.youtubeVideoId : '',
        playerVars: {
          autoplay: 1,
          controls: 1,
          disablekb: 0,
          fs: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(isMuted ? 0 : volume * 100);
            if (isYouTubeTrack && isPlaying) {
              event.target.playVideo();
            }
          },
          onStateChange: (event: any) => {
            if (event.data === 0 && isYouTubeTrack) {
              onTrackEnded();
            }
          },
          onError: (e: any) => {
            console.warn('YouTube playback event error:', e);
          },
        },
      });
    } catch (err) {
      console.warn('Error creating YT player:', err);
    }
  };

  // 2. Track Change
  useEffect(() => {
    if (!isYouTubeTrack) {
      if (playerRef.current?.stopVideo) {
        try {
          playerRef.current.stopVideo();
        } catch {}
      }
      return;
    }

    if (playerRef.current?.loadVideoById) {
      try {
        playerRef.current.loadVideoById(currentTrack.youtubeVideoId);
        playerRef.current.setVolume(isMuted ? 0 : volume * 100);
        if (isPlaying) {
          playerRef.current.playVideo();
        }
      } catch (err) {
        console.warn('Error loading video in YT Player', err);
      }
    } else if (isApiLoadedRef.current) {
      initYTPlayer();
    }
  }, [currentTrack?.id, currentTrack?.youtubeVideoId, isYouTubeTrack]);

  // 3. Play / Pause Control for YouTube
  useEffect(() => {
    if (!isYouTubeTrack || !playerRef.current) return;

    try {
      if (isPlaying) {
        playerRef.current.playVideo?.();
      } else {
        playerRef.current.pauseVideo?.();
      }
    } catch {}
  }, [isPlaying, isYouTubeTrack]);

  // 4. Volume & Mute Sync for YouTube
  useEffect(() => {
    if (!isYouTubeTrack || !playerRef.current?.setVolume) return;
    try {
      if (isMuted) {
        playerRef.current.mute?.();
      } else {
        playerRef.current.unMute?.();
        playerRef.current.setVolume(volume * 100);
      }
    } catch {}
  }, [volume, isMuted, isYouTubeTrack]);

  // 5. Seek Sync for YouTube
  useEffect(() => {
    if (seekTarget === null || !isYouTubeTrack || !playerRef.current?.seekTo) return;
    try {
      playerRef.current.seekTo(seekTarget, true);
    } catch {}
  }, [seekTarget, isYouTubeTrack]);

  // 6. Time polling for YouTube tracks
  useEffect(() => {
    if (!isYouTubeTrack) {
      if (timePollInterval.current) clearInterval(timePollInterval.current);
      return;
    }

    timePollInterval.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime && isPlaying) {
        try {
          const current = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || currentTrack?.duration || 0;
          onTimeUpdate(current, dur);
        } catch {}
      }
    }, 500);

    return () => {
      if (timePollInterval.current) clearInterval(timePollInterval.current);
    };
  }, [currentTrack?.id, isYouTubeTrack, isPlaying]);

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`fixed bottom-24 right-6 z-30 transition-all duration-300 select-none ${!isVideoOpen ? 'hidden' : ''}`}>
      <div
        className={`relative bg-background-surface rounded-2xl border border-white/15 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isMinimized ? 'w-64 h-12' : 'w-72 sm:w-80 h-52 sm:h-56'
        }`}
      >
        {/* Top Header Bar */}
        <div className="px-3.5 py-2.5 bg-background-card/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {isYouTubeTrack ? (
              <Video className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
            )}
            <span className="text-xs font-bold text-white tracking-wide truncate">
              {isYouTubeTrack ? 'Live Video Stream' : 'Studio Visualizer'}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-text-secondary hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsVideoOpen(false)}
              className="p-1 text-text-secondary hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Close window"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className={`flex-1 w-full relative ${isMinimized ? 'hidden' : 'flex'}`}>
          {/* YouTube Video Canvas */}
          <div
            className={`w-full h-full bg-black ${isYouTubeTrack ? 'block' : 'hidden'}`}
          >
            <div id="melodix-studio-yt-canvas" className="w-full h-full" />
          </div>

          {/* Lossless Audio Studio Visualizer */}
          {!isYouTubeTrack && (
            <div className="relative w-full h-full bg-gradient-to-br from-background-card to-background-surface flex flex-col items-center justify-center p-4 overflow-hidden">
              <img
                src={currentTrack.artwork}
                alt={currentTrack.title}
                className="absolute inset-0 w-full h-full object-cover opacity-20 blur-lg scale-125"
              />

              <div className="relative z-10 flex flex-col items-center text-center space-y-2.5 w-full">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-2xl border border-white/20 group">
                  <img
                    src={currentTrack.artwork}
                    alt={currentTrack.title}
                    className={`w-full h-full object-cover ${
                      isPlaying ? 'scale-105' : 'scale-100'
                    } transition-transform duration-700`}
                  />
                  {isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-xs">
                      <div className="flex items-end gap-1 h-7">
                        <span className="w-1.5 bg-emerald-400 rounded-full animate-eq-1 shadow-[0_0_8px_#10B981]" />
                        <span className="w-1.5 bg-emerald-400 rounded-full animate-eq-2 shadow-[0_0_8px_#10B981]" />
                        <span className="w-1.5 bg-emerald-400 rounded-full animate-eq-3 shadow-[0_0_8px_#10B981]" />
                        <span className="w-1.5 bg-emerald-400 rounded-full animate-eq-4 shadow-[0_0_8px_#10B981]" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="max-w-[220px]">
                  <div className="text-xs font-bold text-white truncate" title={currentTrack.title}>
                    {currentTrack.title}
                  </div>
                  <div className="text-[11px] text-text-secondary truncate mt-0.5" title={currentTrack.artist}>
                    {currentTrack.artist}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <Disc3 className="w-3 h-3 animate-spin text-emerald-400" style={{ animationDuration: '3s' }} />
                    <span>320kbps Master HD</span>
                  </div>
                  <span className="text-[10px] text-text-muted tabular-nums font-mono">
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                  </span>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
