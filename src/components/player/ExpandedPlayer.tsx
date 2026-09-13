import React, { useState, useEffect, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';
import { fetchLyrics, type UnifiedLyricsResult, type SyncedLyricLine } from '../../services/lyricsService';
import { romanizeIndicText, containsIndicScript } from '../../utils/romanizer';
import { DownloadModal } from '../common/DownloadModal';
import { 
  ChevronDown, 
  X,
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Heart, 
  Volume2, 
  VolumeX, 
  ListPlus, 
  Languages, 
  Mic2, 
  Radio, 
  Music2,
  Download,
  Loader2,
} from 'lucide-react';
import { AddToPlaylistModal } from '../playlist/AddToPlaylistModal';
import { CreatePlaylistModal } from '../playlist/CreatePlaylistModal';

interface ExpandedPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpandedPlayer: React.FC<ExpandedPlayerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle: isShuffled,
    repeatMode,
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
    autoplay,
    toggleAutoplay,
    settings,
  } = useAudio();

  const [mobileTab, setMobileTab] = useState<'player' | 'lyrics'>('player');
  const [lyricsResult, setLyricsResult] = useState<UnifiedLyricsResult | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState<boolean>(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);

  // Lyrics Script Mode: 'roman' (Hinglish/Romanized default) or 'original'
  const [scriptMode, setScriptMode] = useState<'roman' | 'original'>('roman');
  const [hasIndicLyrics, setHasIndicLyrics] = useState<boolean>(false);

  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  // Load lyrics on track change
  useEffect(() => {
    if (!isOpen || !currentTrack) return;

    let isMounted = true;
    setLoadingLyrics(true);
    setLyricsResult(null);
    setScriptMode('roman');

    const load = async () => {
      const res = await fetchLyrics(
        currentTrack.title,
        currentTrack.artist,
        currentTrack.rawSaavnId,
        currentTrack.duration
      );
      if (isMounted) {
        setLyricsResult(res);
        const sampleText = res.syncedLyrics?.[0]?.text || res.plainLyrics || '';
        setHasIndicLyrics(containsIndicScript(sampleText));
        setLoadingLyrics(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [isOpen, currentTrack?.id]);

  // Compute displayed lyrics based on scriptMode
  const displayedSyncedLyrics: SyncedLyricLine[] | undefined = (() => {
    if (!lyricsResult?.syncedLyrics) return undefined;
    if (scriptMode === 'original') return lyricsResult.syncedLyrics;

    // Automatic Romanized Hinglish
    return lyricsResult.syncedLyrics.map((l) => ({
      time: l.time,
      text: romanizeIndicText(l.text),
    }));
  })();

  const displayedPlainLyrics: string | undefined = (() => {
    if (!lyricsResult?.plainLyrics) return undefined;
    if (scriptMode === 'original') return lyricsResult.plainLyrics;
    return lyricsResult.plainLyrics
      .split('\n')
      .map((line) => romanizeIndicText(line))
      .join('\n');
  })();

  // Active line index for real-time karaoke highlight
  const activeLineIndex = (() => {
    if (!displayedSyncedLyrics || displayedSyncedLyrics.length === 0) return -1;
    for (let i = displayedSyncedLyrics.length - 1; i >= 0; i--) {
      if (currentTime >= displayedSyncedLyrics[i].time - 0.2) {
        return i;
      }
    }
    return 0;
  })();

  // Auto-scroll lyrics smoothly to center
  useEffect(() => {
    if (activeLineRef.current && lyricsContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex, scriptMode]);

  const handleDownload = () => {
    if (!currentTrack) return;
    setIsDownloadModalOpen(true);
  };

  if (!isOpen || !currentTrack) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const liked = isLiked(currentTrack.id);

  return (
    <div className="fixed inset-0 z-50 h-[100dvh] w-screen bg-background/98 backdrop-blur-3xl flex flex-col animate-in fade-in zoom-in-95 duration-200 select-none overflow-hidden">
      {/* Background Ambient Glow (Settings #11) */}
      {settings?.dynamicBackgrounds && (
        <div
          className="absolute inset-0 opacity-20 pointer-events-none blur-3xl scale-125 transition-all duration-1000"
          style={{
            backgroundImage: `url(${currentTrack.artwork})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Prominent Fixed Close Button at Top-Right */}
      <button
        onClick={onClose}
        aria-label="Close Fullscreen Player"
        className="fixed top-3 right-4 md:top-5 md:right-8 z-50 p-2.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-white/20 text-white shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
        title="Close Player (ESC)"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Top Header Bar */}
      <header className="relative z-20 px-4 md:px-8 py-3 flex items-center justify-between border-b border-white/5 shrink-0 pr-16 md:pr-24">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-text-secondary hover:text-white hover:bg-white/5 transition-all"
        >
          <ChevronDown className="w-5 h-5" />
          <span className="text-xs font-semibold hidden sm:inline">Minimize</span>
        </button>

        {/* Mobile Tab Switcher */}
        <div className="md:hidden flex items-center bg-white/5 rounded-xl p-1 border border-white/10 text-xs">
          <button
            onClick={() => setMobileTab('player')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              mobileTab === 'player'
                ? 'bg-emerald-500 text-neutral-950 shadow-md'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Player
          </button>
          <button
            onClick={() => setMobileTab('lyrics')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              mobileTab === 'lyrics'
                ? 'bg-emerald-500 text-neutral-950 shadow-md'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Lyrics
          </button>
        </div>

        {/* Action Toggle on Top Right */}
        <div className="flex items-center gap-2">
          {hasIndicLyrics && (
            <button
              onClick={() => setScriptMode((prev) => (prev === 'roman' ? 'original' : 'roman'))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/10 transition-colors"
            >
              <Languages className="w-3.5 h-3.5 text-emerald-400" />
              <span>{scriptMode === 'roman' ? 'Show in Original' : 'Show in Hinglish'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Split View */}
      <main className="relative z-10 flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-hidden items-stretch">
        
        {/* Left Side: Real-Time Synced Lyrics */}
        <section
          aria-label="Live Synced Lyrics"
          className={`h-full min-h-0 flex flex-col rounded-3xl bg-background-surface/80 border border-white/10 p-5 md:p-6 overflow-hidden backdrop-blur-md shadow-2xl ${
            mobileTab === 'lyrics' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <Mic2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live Synced Lyrics</h3>
            </div>

            {hasIndicLyrics && (
              <span className="text-[11px] text-text-muted">
                {scriptMode === 'roman' ? 'Hinglish' : 'Original Script'}
              </span>
            )}
          </div>

          {/* Scrolling Lyrics Container */}
          <div
            ref={lyricsContainerRef}
            className="flex-1 min-h-0 overflow-y-auto py-6 space-y-6 text-center no-scrollbar font-sans"
          >
            {loadingLyrics ? (
              <div className="flex flex-col items-center justify-center h-full text-text-muted gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
                <p className="text-xs font-medium">Fetching real-time synced lyrics...</p>
              </div>
            ) : displayedSyncedLyrics && displayedSyncedLyrics.length > 0 ? (
              displayedSyncedLyrics.map((line, idx) => {
                const isActive = idx === activeLineIndex;
                const isPast = idx < activeLineIndex;
                return (
                  <div
                    key={`lyric-line-${idx}`}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => seekTo(line.time)}
                    className={`cursor-pointer transition-all duration-300 py-2 px-4 rounded-2xl ${
                      isActive
                        ? 'text-emerald-400 font-extrabold text-xl md:text-2xl scale-105 bg-emerald-950/40 border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
                        : isPast
                        ? 'text-neutral-400 font-medium text-base md:text-lg hover:text-white'
                        : 'text-neutral-600 font-medium text-base md:text-lg hover:text-white'
                    }`}
                  >
                    {line.text}
                  </div>
                );
              })
            ) : displayedPlainLyrics ? (
              <div className="text-base md:text-lg leading-relaxed text-neutral-200 font-medium whitespace-pre-line py-6">
                {displayedPlainLyrics}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-text-muted space-y-2">
                <Music2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Lyrics Not Available</h4>
                <p className="text-xs text-text-secondary">
                  Enjoy studio audio playback for {currentTrack.title}.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Album Art, Track Info & Playback Controls */}
        <section
          aria-label="Now Playing Controls"
          className={`h-full min-h-0 flex flex-col justify-between max-w-md mx-auto w-full py-2 overflow-y-auto no-scrollbar ${
            mobileTab === 'player' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {/* Artwork */}
          <div className="relative aspect-square w-full max-w-[220px] sm:max-w-[280px] md:max-w-[320px] max-h-[35vh] mx-auto rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 group shrink-0">
            <img
              src={currentTrack.artwork}
              alt={currentTrack.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {isPlaying && (
              <div className="absolute bottom-3 right-3 flex items-end gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                <span className="w-1 bg-emerald-400 h-3 animate-pulse rounded-full" />
                <span className="w-1 bg-emerald-400 h-5 animate-pulse delay-75 rounded-full" />
                <span className="w-1 bg-emerald-400 h-2.5 animate-pulse delay-150 rounded-full" />
              </div>
            )}
          </div>

          {/* Track Info & Actions */}
          <div className="flex items-center justify-between gap-4 mt-3 shrink-0">
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-white truncate tracking-tight">
                {currentTrack.title}
              </h2>
              <p className="text-xs md:text-sm font-medium text-text-secondary truncate mt-0.5">
                {currentTrack.artist}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Download Song Button */}
              <button
                onClick={handleDownload}
                title="Download Song"
                className="p-2 rounded-xl border transition-all bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border-white/10"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsAddToPlaylistOpen(true)}
                title="Add to Playlist"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/10 transition-colors"
              >
                <ListPlus className="w-4 h-4" />
              </button>

              <button
                onClick={() => toggleLike(currentTrack)}
                title={liked ? 'Unlike' : 'Like Track'}
                className={`p-2 rounded-xl border transition-all ${
                  liked
                    ? 'bg-red-500/20 text-red-400 border-red-500/30 scale-105 shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border-white/10'
                }`}
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1 mt-3 shrink-0">
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const newPct = clickX / rect.width;
                seekTo(newPct * duration);
              }}
              className="relative h-2 bg-white/10 hover:h-2.5 rounded-full cursor-pointer overflow-hidden transition-all"
            >
              <div
                className="absolute left-0 top-0 bottom-0 bg-emerald-500 rounded-full transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Core Player Controls */}
          <div className="flex items-center justify-between gap-3 mt-2 shrink-0">
            <button
              onClick={toggleShuffle}
              title={`Shuffle: ${isShuffled ? 'On' : 'Off'}`}
              className={`p-2.5 rounded-xl transition-all ${
                isShuffled
                  ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-500/30'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <button
              onClick={playPrevious}
              title="Previous Track"
              className="p-2 rounded-xl text-white hover:scale-110 hover:bg-white/5 transition-all"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={togglePlayPause}
              title="Play / Pause"
              className="w-14 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={playNext}
              title="Next Track"
              className="p-2 rounded-xl text-white hover:scale-110 hover:bg-white/5 transition-all"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={cycleRepeatMode}
              title={`Repeat: ${repeatMode}`}
              className={`p-2.5 rounded-xl transition-all ${
                repeatMode !== 'off'
                  ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-500/30'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
            </button>
          </div>

          {/* Bottom Bar: Autoplay Radio & Volume */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-2 shrink-0">
            <button
              onClick={toggleAutoplay}
              title="Autoplay: Continuously finds and plays related songs when track ends"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                autoplay
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                  : 'bg-white/5 text-text-muted border-white/5 hover:text-white'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${autoplay ? 'text-emerald-400 animate-pulse' : ''}`} />
              <span>Autoplay</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                title="Toggle Mute"
                className="p-1 text-text-secondary hover:text-white"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <div className="relative w-24 flex items-center group py-1">
                {/* Solid Non-Transparent Background Track */}
                <div className="absolute inset-y-0 my-auto h-1.5 group-hover:h-2 w-full rounded-full bg-neutral-800 border border-white/15 overflow-hidden transition-all shadow-inner">
                  {/* Vibrant Emerald Filled Bar */}
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  aria-label="Volume"
                  className="relative w-full h-4 opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        isOpen={isAddToPlaylistOpen}
        onClose={() => setIsAddToPlaylistOpen(false)}
        track={currentTrack}
        onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
      />

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreatePlaylistOpen}
        onClose={() => setIsCreatePlaylistOpen(false)}
        onCreated={() => {}}
      />

      {/* Download Modal */}
      <DownloadModal
        track={currentTrack}
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />
    </div>
  );
};
