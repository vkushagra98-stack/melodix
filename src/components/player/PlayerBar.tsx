import React, { useState } from 'react';
import { useAudio } from '../../context/AudioContext';
import { formatDuration } from '../../utils/formatters';
import { SourceBadge } from '../common/SourceBadge';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  ListMusic,
  Maximize2,
  PictureInPicture2,
  Radio,
  Download,
  Check,
  Loader2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { toggleDocumentPiP } from '../../utils/pipManager';

export const PlayerBar: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    shuffle: isShuffled,
    isLyricsOpen,
    isQueueOpen,
    isVideoOpen,
    autoplay,
    isDjMode,
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
    isAiEnhancerEnabled,
    toggleAiEnhancer,
    addDownloadedTrack,
    openDownloadModal,
  } = useAudio();

  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!currentTrack) return null;

  const liked = isLiked(currentTrack.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const currentProgress = isDragging ? dragProgress : progressPercent;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setDragProgress(val);
  };

  const handleSeekMouseDown = () => {
    setIsDragging(true);
  };

  const handleSeekMouseUp = () => {
    setIsDragging(false);
    const newTime = (dragProgress / 100) * duration;
    seekTo(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentTrack) return;
    openDownloadModal(currentTrack);
  };

  return (
    <footer className="w-full h-[68px] sm:h-[84px] bg-background-surface/98 backdrop-blur-xl border-t border-border flex items-center px-2.5 sm:px-4 lg:px-6 relative shadow-player">
      {/* Mobile Top Progress Line */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-[2.5px] bg-white/10 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-150 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
          style={{ width: `${currentProgress || 0}%` }}
        />
      </div>

      {/* 1. Left Section: Now Playing */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 md:flex-initial md:w-1/4 md:max-w-xs min-w-0 relative z-10">
        {/* Artwork with Ambient Glow Effect */}
        <div className="relative group shrink-0">
          <div
            className={`absolute -inset-1 rounded-xl bg-gradient-to-r from-emerald-500/40 via-teal-500/30 to-emerald-400/20 blur-md transition-opacity duration-700 pointer-events-none ${
              isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
            }`}
          />
          <div 
            onClick={() => setIsExpandedPlayerOpen(true)}
            className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl overflow-hidden shrink-0 shadow-lg shadow-black/50 cursor-pointer border border-white/10"
          >
            <img
              src={currentTrack.artwork}
              alt={currentTrack.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div
            onClick={() => setIsExpandedPlayerOpen(true)}
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <h4
              className="text-xs sm:text-sm font-bold text-white truncate hover:text-emerald-400 transition-colors"
              title={currentTrack.title}
            >
              {currentTrack.title}
            </h4>
            {/* Live Audio Equalizer Waveform Bars Effect */}
            <div className="flex items-end gap-0.5 h-3 px-1 shrink-0" title={isPlaying ? "Playing" : "Paused"}>
              <span className={`w-0.5 bg-emerald-400 rounded-full transition-all duration-300 ${isPlaying ? 'h-2.5 animate-pulse' : 'h-1 opacity-30'}`} />
              <span className={`w-0.5 bg-emerald-400 rounded-full transition-all duration-200 ${isPlaying ? 'h-3 animate-bounce' : 'h-1.5 opacity-30'}`} style={{ animationDuration: '0.6s' }} />
              <span className={`w-0.5 bg-emerald-400 rounded-full transition-all duration-300 ${isPlaying ? 'h-2 animate-pulse' : 'h-1 opacity-30'}`} style={{ animationDuration: '0.8s' }} />
              <span className={`w-0.5 bg-emerald-400 rounded-full transition-all duration-200 ${isPlaying ? 'h-2.5 animate-bounce' : 'h-1 opacity-30'}`} style={{ animationDuration: '0.5s' }} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[11px] sm:text-xs text-text-secondary truncate" title={currentTrack.artist}>
              {currentTrack.artist}
            </p>
            <div className="hidden sm:block">
              <SourceBadge source={currentTrack.source} quality={currentTrack.quality} size="sm" />
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(currentTrack);
          }}
          title={liked ? 'Unlike' : 'Like'}
          className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0 ${
            liked ? 'text-red-400 scale-110 shadow-[0_0_12px_rgba(248,113,113,0.4)]' : 'text-text-muted hover:text-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          title={downloadSuccess ? 'Downloaded!' : 'Download MP3'}
          className="hidden sm:block p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          ) : downloadSuccess ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* 2. Center Section: Playback Controls & Progress Bar */}
      <div className="flex flex-col items-center shrink-0 md:flex-1 md:max-w-xl mx-1 sm:mx-2">
        {/* Buttons Row */}
        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 md:mb-1.5">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            title={isShuffled ? 'Disable Shuffle (S)' : 'Enable Shuffle (S)'}
            className={`hidden sm:block p-1.5 rounded-lg hover:bg-white/5 transition-colors ${
              isShuffled ? 'text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-text-muted hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Previous */}
          <button
            onClick={playPrevious}
            title="Previous track (Shift+Left)"
            className="p-1.5 rounded-lg hover:bg-white/5 text-neutral-300 hover:text-white transition-colors"
          >
            <SkipBack className="w-4 h-4 md:w-5 md:h-5 fill-current" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlayPause}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--color-accent,#10b981)] hover:brightness-110 text-neutral-950 flex items-center justify-center shadow-[0_0_16px_rgba(16,185,129,0.4)] hover:shadow-[0_0_24px_rgba(16,185,129,0.65)] transition-all active:scale-95 cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 md:w-5 md:h-5 fill-current" />
            ) : (
              <Play className="w-4 h-4 md:w-5 md:h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={playNext}
            title="Next track (Shift+Right)"
            className="p-1.5 rounded-lg hover:bg-white/5 text-neutral-300 hover:text-white transition-colors"
          >
            <SkipForward className="w-4 h-4 md:w-5 md:h-5 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={cycleRepeatMode}
            title={`Repeat: ${repeatMode.toUpperCase()} (R)`}
            className={`hidden sm:block p-1.5 rounded-lg hover:bg-white/5 transition-colors ${
              repeatMode !== 'off' ? 'text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-text-muted hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Scrub Bar & Times (Desktop) */}
        <div className="hidden md:flex items-center gap-3 w-full max-w-lg">
          <span className="text-[11px] text-text-muted tabular-nums w-10 text-right font-mono">
            {formatDuration(isDragging ? (dragProgress / 100) * duration : currentTime)}
          </span>

          <div className="relative flex-1 flex items-center group py-1">
            {/* Custom background track */}
            <div className="absolute inset-y-0 my-auto h-1.5 group-hover:h-2 w-full rounded-full bg-white/10 transition-all overflow-hidden">
              {/* Colored fill with glowing edge */}
              <div
                className="h-full bg-[var(--color-accent,#10b981)] rounded-full transition-none shadow-[0_0_8px_var(--color-accent,#10b981)]"
                style={{ width: `${currentProgress || 0}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={currentProgress || 0}
              onChange={handleSeekChange}
              onMouseDown={handleSeekMouseDown}
              onMouseUp={handleSeekMouseUp}
              onTouchStart={handleSeekMouseDown}
              onTouchEnd={handleSeekMouseUp}
              className="relative w-full h-4 opacity-0 cursor-pointer"
              aria-label="Seek"
            />
          </div>

          <span className="text-[11px] text-text-muted tabular-nums w-10">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* 3. Right Section: Modals, Fullscreen, and Volume */}
      <div className="flex items-center justify-end gap-1 sm:gap-2 shrink-0 md:w-1/4 md:max-w-xs">
        {/* Fullscreen Immersive View Expand Button */}
        <button
          onClick={() => setIsExpandedPlayerOpen(true)}
          title="Open Fullscreen Immersive Player (F)"
          className="p-1.5 sm:p-2 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Floating Desktop Mini-Player (Document PiP — Stays on top of Windows/all apps) */}
        <button
          onClick={() => {
            toggleDocumentPiP(currentTrack, isPlaying, currentTime, duration, {
              togglePlayPause,
              playNext,
              playPrevious,
            });
          }}
          title="Floating Mini-Player (Always-On-Top over Windows & other apps)"
          className="p-1.5 sm:p-2 rounded-lg text-text-muted hover:text-emerald-400 hover:bg-white/5 transition-colors cursor-pointer"
        >
          <PictureInPicture2 className="w-4 h-4" />
        </button>





        {/* Queue Drawer Button */}
        <button
          onClick={() => setIsQueueOpen(!isQueueOpen)}
          title="Up Next / Queue"
          className={`hidden sm:block p-1.5 md:p-2 rounded-lg transition-colors ${
            isQueueOpen
              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
              : 'text-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <ListMusic className="w-4 h-4" />
        </button>

        <button
          onClick={toggleAutoplay}
          title={autoplay ? 'Disable Autoplay' : 'Enable Autoplay'}
          className={`hidden lg:flex p-1.5 md:p-2 rounded-lg transition-colors items-center gap-1.5 ${
            autoplay
              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
              : 'text-text-muted hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Radio className="w-4 h-4" />
        </button>

        <button
          onClick={toggleAiEnhancer}
          title={isAiEnhancerEnabled ? 'Disable AI Audio Enhancer (Clarity & Bass)' : 'Enable AI Audio Enhancer'}
          className={`hidden md:flex p-1.5 md:p-2 rounded-lg transition-colors items-center gap-1.5 ${
            isAiEnhancerEnabled
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
              : 'text-text-muted hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Wand2 className={`w-4 h-4 ${isAiEnhancerEnabled ? 'animate-pulse' : ''}`} />
        </button>

        <button
          onClick={toggleDjMode}
          title={isDjMode ? 'Disable AI DJ (Continuous Fade Mix)' : 'Enable AI DJ (Continuous Fade Mix)'}
          className={`hidden md:flex p-1.5 md:p-2 rounded-lg transition-colors items-center gap-1.5 ${
            isDjMode
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
              : 'text-text-muted hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${isDjMode ? 'animate-pulse' : ''}`} />
        </button>

        {/* Volume Controls (Desktop) */}
        <div className="hidden lg:flex items-center gap-2 ml-1">
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
            className="p-1 text-text-muted hover:text-white transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-neutral-400" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <div className="relative w-20 flex items-center group py-1">
            {/* Solid Non-Transparent Background Track */}
            <div className="absolute inset-y-0 my-auto h-1.5 group-hover:h-2 w-full rounded-full bg-neutral-800 border border-white/15 overflow-hidden transition-all shadow-inner">
              {/* Vibrant Accent Filled Bar */}
              <div
                className="h-full bg-[var(--color-accent,#10b981)] rounded-full transition-all"
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              aria-label="Volume"
              className="relative w-full h-4 opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};
