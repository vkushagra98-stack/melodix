import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Play, 
  Music, 
  Loader2, 
  Wand2, 
  Flame, 
  Radio, 
  ListMusic, 
  Heart, 
  Check 
} from 'lucide-react';
import { generateAiPlaylist } from '../../services/aiPlaylistGenerator';
import { useAudio } from '../../context/AudioContext';
import { useToast } from '../../context/ToastContext';
import { storage } from '../../utils/storage';
import { firebaseAuth } from '../../services/firebaseAuth';
import type { Playlist, Track } from '../../types/music';

interface AiPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaylistCreated?: (playlist: Playlist) => void;
}

const QUICK_PROMPTS = [
  { label: '🏎️ Phonk Gym Beast', prompt: 'Aggressive drift phonk high bass for heavy gym workout' },
  { label: '🌧️ Late Night Hindi Chill', prompt: 'Soulful acoustic Hindi late night songs like O Maahi and Jhol' },
  { label: '🎸 Coke Studio Indie', prompt: 'Acoustic Coke Studio and indie fusion tracks with Maanu and Hasan Raheem' },
  { label: '💃 Punjabi Party Bangers', prompt: 'High energy Punjabi party songs by Diljit Dosanjh and Karan Aujla' },
  { label: '☕ Lofi Focus & Study', prompt: 'Chill lo-fi aesthetic beats for deep coding and studying' },
  { label: '💖 2000s Bollywood Nostalgia', prompt: 'Nostalgic 2000s Bollywood romantic hits by KK and Pritam' },
];

export const AiPlaylistModal: React.FC<AiPlaylistModalProps> = ({
  isOpen,
  onClose,
  onPlaylistCreated,
}) => {
  const { playTrack, user, openAuthModal } = useAudio();
  const { showToast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedPlaylist, setGeneratedPlaylist] = useState<Playlist | null>(null);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  // Detect if user is giving a "play X" command vs asking for a playlist
  const isPlayCommand = (q: string) => {
    const lq = q.trim().toLowerCase();
    
    // Explicit commands
    if (/^(play|search|find|found|open|start|listen to)(\s+the|\s+for|\s+for\s+the)?\s+.+$/i.test(lq) && !lq.includes('playlist') && !lq.includes('mix') && !lq.includes('hour')) {
      return true;
    }
    
    // Implicit: if it's 3 words or less, and doesn't contain playlist words, they probably just want the song
    const wordCount = lq.split(' ').length;
    const isPlaylistRequest = lq.includes('playlist') || lq.includes('mix') || lq.includes('vibes') || lq.includes('chill') || lq.includes('study') || lq.includes('workout');
    
    if (wordCount <= 4 && !isPlaylistRequest) {
      return true;
    }
    
    return false;
  };

  const handleGenerate = async (queryToUse?: string) => {
    const q = queryToUse || prompt;
    if (!q.trim()) return;

    setLoading(true);
    setGeneratedPlaylist(null);
    setSaved(false);

    try {
      // If user typed "play jugnu" / "found the majboor song", search and play that song directly
      if (isPlayCommand(q)) {
        const searchQuery = q
          .replace(/^(play|search|find|found|open|start|listen to)(\s+the|\s+for|\s+for\s+the)?\s+/i, '')
          .replace(/\s+(song|songs|track|tracks)$/i, '')
          .trim();
        const { searchUnified } = await import('../../services/unifiedSearch');
        const results = await searchUnified(searchQuery);
        const topTrack = results.all[0];
        if (topTrack) {
          playTrack(topTrack, results.all.slice(0, 10));
          showToast(`▶ Playing "${topTrack.title}"`);
          onClose();
          return;
        }
        showToast(`Could not find "${searchQuery}"`, 'warning');
        setLoading(false);
        return;
      }

      const pl = await generateAiPlaylist(q);
      setGeneratedPlaylist(pl);
      showToast(`✨ AI crafted "${pl.title}" for you!`);
    } catch (err: any) {
      console.warn('AI playlist error:', err);
      showToast('Failed to generate playlist. Try again!', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayNow = () => {
    if (!generatedPlaylist || !generatedPlaylist.tracks || generatedPlaylist.tracks.length === 0) return;
    
    // Save to user playlists
    storage.savePlaylist(generatedPlaylist);
    if (user) {
      firebaseAuth.syncToCloud().catch(() => {});
    }
    if (onPlaylistCreated) onPlaylistCreated(generatedPlaylist);

    showToast(`Playing mix: ${generatedPlaylist.title}`);

    // Play first track
    playTrack(generatedPlaylist.tracks[0], generatedPlaylist.tracks);
    onClose();
  };

  const handleSaveToLibrary = () => {
    if (!generatedPlaylist) return;

    storage.savePlaylist(generatedPlaylist);
    
    if (user) {
      firebaseAuth.syncToCloud().catch(() => {});
    }
    
    if (onPlaylistCreated) onPlaylistCreated(generatedPlaylist);
    setSaved(true);
    showToast(`Saved "${generatedPlaylist.title}" to your library`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 select-none overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-neutral-950 border border-emerald-500/30 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.2)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-950/40 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>AI Playlist Creator</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AI
                </span>
              </h3>
              <p className="text-xs text-text-secondary">
                Describe any mood, story, genre, or artist to generate custom mixes.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-text-secondary hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {/* Input Box */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              What kind of playlist do you want?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="e.g. Make me a 2-hour playlist for a late-night drive, mostly Hindi with some Punjabi..."
                className="flex-1 px-4 py-3 rounded-2xl bg-neutral-900 border border-white/10 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-emerald-500/50 focus:bg-neutral-800 transition-all shadow-inner"
              />
              <button
                onClick={() => handleGenerate()}
                disabled={loading || !prompt.trim()}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                <span>{loading ? 'Curating...' : 'Generate'}</span>
              </button>
            </div>
          </div>

          {/* Quick Preset Mood Chips */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-text-muted">Or pick a trending vibe:</span>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={`qp-${idx}`}
                  onClick={() => {
                    setPrompt(qp.prompt);
                    handleGenerate(qp.prompt);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/5 hover:border-emerald-500/30 text-xs font-medium transition-all"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-8 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">AI is crafting your playlist...</p>
                <p className="text-xs text-text-secondary">Analyzing vibes and matching high quality studio audio.</p>
              </div>
            </div>
          )}

          {/* Generated Playlist Result */}
          {generatedPlaylist && !loading && (
            <div className="p-5 rounded-2xl bg-neutral-900 border border-emerald-500/30 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-4">
                <img
                  src={generatedPlaylist.cover}
                  alt={generatedPlaylist.title}
                  className="w-16 h-16 rounded-xl object-cover border border-white/10 shadow-lg shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-semibold uppercase">
                      {generatedPlaylist.category}
                    </span>
                    <span className="text-xs text-text-muted">
                      {generatedPlaylist.tracks?.length || 0} tracks
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white truncate mt-0.5">
                    {generatedPlaylist.title}
                  </h4>
                  <p className="text-xs text-text-secondary line-clamp-1">
                    {generatedPlaylist.description}
                  </p>
                </div>
              </div>

              {/* Tracks Preview */}
              <div className="max-h-48 overflow-y-auto divide-y divide-white/5 rounded-xl bg-neutral-950 p-2 no-scrollbar">
                {generatedPlaylist.tracks?.map((track, i) => (
                  <div key={`track-${i}`} className="flex items-center justify-between py-2 px-2 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-text-muted w-4 text-center">{i + 1}</span>
                      <img src={track.artwork} alt={track.title} className="w-7 h-7 rounded object-cover" />
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{track.title}</p>
                        <p className="text-[11px] text-text-secondary truncate">{track.artist}</p>
                      </div>
                    </div>
                    <span className="text-text-muted text-[11px]">{track.durationFormatted || '3:30'}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleSaveToLibrary}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    saved
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                  }`}
                >
                  {saved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ListMusic className="w-3.5 h-3.5" />}
                  <span>{saved ? 'Saved to Library' : 'Save to Library'}</span>
                </button>

                <button
                  onClick={handlePlayNow}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Mix Now</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
