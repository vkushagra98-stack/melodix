import React, { useState, useEffect, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';
import { fetchLyrics, type UnifiedLyricsResult, type SyncedLyricLine } from '../../services/lyricsService';
import { romanizeIndicText, containsIndicScript } from '../../utils/romanizer';
import { 
  X, 
  Copy, 
  Check, 
  Music2, 
  Mic2, 
  FileText, 
  Languages, 
  Loader2 
} from 'lucide-react';

export const LyricsModal: React.FC = () => {
  const { currentTrack, currentTime, seekTo, isLyricsOpen, setIsLyricsOpen, settings } = useAudio();
  const [lyricsResult, setLyricsResult] = useState<UnifiedLyricsResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'synced' | 'plain'>('synced');

  // Script Mode: 'roman' (Hinglish default) or 'original'
  const [scriptMode, setScriptMode] = useState<'roman' | 'original'>('roman');
  const [hasIndicLyrics, setHasIndicLyrics] = useState<boolean>(false);

  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load lyrics on track change or modal open
  useEffect(() => {
    if (!isLyricsOpen || !currentTrack) return;

    let isMounted = true;
    setLoading(true);
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
        setViewMode(res.hasSynced ? 'synced' : 'plain');
        const sampleText = res.syncedLyrics?.[0]?.text || res.plainLyrics || '';
        setHasIndicLyrics(containsIndicScript(sampleText));
        setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [isLyricsOpen, currentTrack?.id]);

  // Compute displayed lyrics based on scriptMode
  const displayedSyncedLyrics: SyncedLyricLine[] | undefined = (() => {
    if (!lyricsResult?.syncedLyrics) return undefined;
    if (scriptMode === 'original') return lyricsResult.syncedLyrics;

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

  // Determine currently active synced line based on currentTime
  const activeLineIndex = (() => {
    if (!displayedSyncedLyrics || displayedSyncedLyrics.length === 0) return -1;
    for (let i = displayedSyncedLyrics.length - 1; i >= 0; i--) {
      if (currentTime >= displayedSyncedLyrics[i].time - 0.2) {
        return i;
      }
    }
    return 0;
  })();

  // Smoothly auto-scroll container to keep active line in view
  useEffect(() => {
    if (viewMode === 'synced' && activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex, viewMode, scriptMode]);

  if (!isLyricsOpen || !currentTrack) return null;

  const handleCopy = () => {
    let text = displayedPlainLyrics || '';
    if (!text && displayedSyncedLyrics) {
      text = displayedSyncedLyrics.map((l) => l.text).join('\n');
    }
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLineClick = (time: number) => {
    seekTo(time);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-2xl h-[84vh] flex flex-col bg-background-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Dynamic Ambiance Backdrop (Settings #14) */}
        {settings?.showLyricsBackground && currentTrack?.artwork && (
          <div 
            className="absolute inset-0 pointer-events-none opacity-20 filter blur-3xl scale-125 bg-center bg-cover transition-opacity duration-700"
            style={{ backgroundImage: `url(${currentTrack.artwork})` }}
          />
        )}

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-background-card/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={currentTrack.artwork}
              alt={currentTrack.title}
              className="w-11 h-11 rounded-xl object-cover border border-white/10 shadow-md shrink-0"
            />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                {currentTrack.title}
              </h3>
              <p className="text-xs text-text-secondary truncate">
                {currentTrack.artist}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Show in Original / Show in Hinglish toggle */}
            {hasIndicLyrics && (
              <button
                onClick={() => setScriptMode((prev) => (prev === 'roman' ? 'original' : 'roman'))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/10 transition-colors"
              >
                <Languages className="w-3.5 h-3.5 text-emerald-400" />
                <span>{scriptMode === 'roman' ? 'Show in Original' : 'Show in Hinglish'}</span>
              </button>
            )}

            {/* View Mode Toggle */}
            {lyricsResult?.hasSynced && (
              <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10 text-xs">
                <button
                  onClick={() => setViewMode('synced')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                    viewMode === 'synced'
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                      : 'text-text-muted hover:text-white'
                  }`}
                  title="Real-time synchronized karaoke lyrics"
                >
                  <Mic2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Synced</span>
                </button>
                <button
                  onClick={() => setViewMode('plain')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                    viewMode === 'plain'
                      ? 'bg-white/10 text-white font-semibold'
                      : 'text-text-muted hover:text-white'
                  }`}
                  title="Plain text lyrics"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Plain</span>
                </button>
              </div>
            )}

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-neutral-300 transition-colors"
              title="Copy Lyrics"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={() => setIsLyricsOpen(false)}
              className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Lyrics Content */}
        <div ref={containerRef} className="p-6 md:p-8 overflow-y-auto flex-1 font-sans no-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-text-muted gap-3">
              <div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
              <p className="text-sm font-medium">Fetching real-time synced lyrics...</p>
            </div>
          ) : viewMode === 'synced' && displayedSyncedLyrics && displayedSyncedLyrics.length > 0 ? (
            /* Time-Synchronized Karaoke View */
            <div className="space-y-6 py-12 text-center max-w-lg mx-auto">
              {displayedSyncedLyrics.map((line, idx) => {
                const isActive = idx === activeLineIndex;
                const isPast = idx < activeLineIndex;
                return (
                  <div
                    key={`lyric-${idx}`}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => handleLineClick(line.time)}
                    className={`cursor-pointer transition-all duration-300 py-2 px-4 rounded-xl ${
                      isActive
                        ? 'text-emerald-400 font-extrabold text-xl md:text-2xl scale-105 bg-emerald-950/30 shadow-[0_0_20px_rgba(160,250,200,0.15)] border border-emerald-500/20'
                        : isPast
                        ? 'text-neutral-400 font-medium text-base md:text-lg hover:text-white hover:scale-102'
                        : 'text-neutral-500 font-medium text-base md:text-lg hover:text-white hover:scale-102'
                    }`}
                  >
                    {line.text}
                  </div>
                );
              })}
            </div>
          ) : displayedPlainLyrics ? (
            /* Plain Text View */
            <div className="space-y-4 max-w-lg mx-auto py-6">
              <div className="text-base md:text-lg leading-relaxed text-neutral-200 font-medium whitespace-pre-line tracking-wide selection:bg-emerald-500/30">
                {displayedPlainLyrics}
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-24 text-center text-text-muted max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3 text-text-secondary border border-white/5">
                <Music2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">
                Lyrics Not Available
              </h4>
              <p className="text-xs text-text-secondary">
                Indexed synchronized lyrics are not yet cataloged for this specific track.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
