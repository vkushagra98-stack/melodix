import React, { useState, useEffect } from 'react';
import type { Track, Playlist } from '../../types/music';
import { useAudio } from '../../context/AudioContext';
import { TrackCard } from '../common/TrackCard';
import { SourceBadge } from '../common/SourceBadge';
import { CURATED_PLAYLISTS, FEATURED_HERO_TRACK, INITIAL_POPULAR_TRACKS } from '../../services/curatedData';
import { searchSaavnSongs } from '../../services/saavnApi';
import { searchUnified } from '../../services/unifiedSearch';
import { storage } from '../../utils/storage';
import { getPersonalizedRecommendations, isJunkTrack } from '../../services/recommendationEngine';
import { Play, Pause, Flame, Sparkles, Zap, Globe2, ChevronRight, Wand2 } from 'lucide-react';

interface HomeViewProps {
  onSelectPlaylist: (playlist: Playlist) => void;
  onQuickSearch: (query: string) => void;
  onOpenAiPlaylist?: () => void;
}

const AI_VIBE_PILLS = [
  { label: '😌 Chill', prompt: 'Very chill, calm, and relaxing songs for unwinding and studying' },
  { label: '🔥 Energetic', prompt: 'Extremely energetic, hype, and upbeat music for workout and party' },
  { label: '💔 Sad', prompt: 'Heartbreaking, sad, emotional, and soulful emotional songs' },
  { label: '🏎️ Drift Phonk Surge', prompt: 'Aggressive drift phonk high bass for heavy gym workout' },
  { label: '🌧️ Late Night Hindi Acoustic', prompt: 'Soulful acoustic Hindi late night songs like O Maahi and Jhol' },
  { label: '🎸 Coke Studio', prompt: 'Acoustic Coke Studio and indie fusion tracks with Maanu and Hasan Raheem' },
  { label: '💃 Punjabi Hits', prompt: 'High energy Punjabi party songs by Diljit Dosanjh and Karan Aujla' },
];

export const HomeView: React.FC<HomeViewProps> = ({ 
  onSelectPlaylist, 
  onQuickSearch,
  onOpenAiPlaylist 
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlayPause, history } = useAudio();

  const [hindiTracks, setHindiTracks] = useState<Track[]>(INITIAL_POPULAR_TRACKS);
  const [englishTracks, setEnglishTracks] = useState<Track[]>([]);
  const [phonkTracks, setPhonkTracks] = useState<Track[]>([]);
  const [aiRecommended, setAiRecommended] = useState<Track[]>([]);
  
  const recentSearches = storage.getSearchHistory();

  useEffect(() => {
    let isMounted = true;

    const loadHomeData = async () => {
      try {
        const [hindiRes, englishRes, phonkRes] = await Promise.allSettled([
          searchSaavnSongs('Arijit Singh Latest Bollywood', 8),
          searchUnified('The Weeknd Taylor Swift Ed Sheeran hits'),
          searchUnified('Kordhell DVRST Brazilian Drift Phonk'),
        ]);

        let aiRecs: Track[] = [];
        try {
          const likedTracks = storage.getLikedTracks();
          aiRecs = await getPersonalizedRecommendations(history, likedTracks);
        } catch (err) {
          console.warn('Recommendation err', err);
        }

        if (isMounted) {
          if (hindiRes.status === 'fulfilled' && hindiRes.value.length > 0) setHindiTracks(hindiRes.value);
          if (englishRes.status === 'fulfilled' && englishRes.value.all.length > 0) setEnglishTracks(englishRes.value.all.slice(0, 8));
          if (phonkRes.status === 'fulfilled' && phonkRes.value.all.length > 0) setPhonkTracks(phonkRes.value.all.slice(0, 8));
          if (aiRecs.length > 0) {
            setAiRecommended(aiRecs.filter(t => !isJunkTrack(t)));
          }
        }
      } catch (err) {
        console.warn('Error loading home tracks:', err);
      }
    };

    loadHomeData();
    return () => { isMounted = false; };
  }, [history]);

  const heroTrack = (aiRecommended && aiRecommended.find(t => !isJunkTrack(t) && t.source === 'jiosaavn')) 
    || (aiRecommended && aiRecommended.find(t => !isJunkTrack(t)))
    || (history && history.find(t => !isJunkTrack(t) && t.source === 'jiosaavn'))
    || (history && history.find(t => !isJunkTrack(t))) 
    || FEATURED_HERO_TRACK;

  const isHeroPlaying = currentTrack?.id === heroTrack.id && isPlaying;

  const handleHeroPlay = () => {
    if (currentTrack?.id === heroTrack.id) {
      togglePlayPause();
    } else {
      playTrack(heroTrack, [heroTrack, ...aiRecommended]);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* 1. Featured Spotlight Banner */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#030b14] via-[#081829] to-[#040f1a] border border-blue-500/10 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden shrink-0 shadow-[0_0_40px_rgba(59,130,246,0.3)] border border-white/10 group">
          <img
            src={heroTrack.artwork}
            alt={heroTrack.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          {isHeroPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
              <div className="flex items-end gap-1 h-8">
                <div className="w-1.5 bg-blue-400 animate-[bounce_1s_infinite_0ms] rounded-full h-full"></div>
                <div className="w-1.5 bg-emerald-400 animate-[bounce_1s_infinite_200ms] rounded-full h-2/3"></div>
                <div className="w-1.5 bg-purple-400 animate-[bounce_1s_infinite_400ms] rounded-full h-4/5"></div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 text-center md:text-left z-10">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Personalized Discovery
            </span>
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight line-clamp-2">
            {heroTrack.title}
          </h2>
          <p className="text-base text-blue-100/70 mt-2 max-w-xl font-medium">
            {heroTrack.artist}
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-6">
            <button
              onClick={handleHeroPlay}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.4)] cursor-pointer"
            >
              {isHeroPlaying ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                  <span>Play Mix</span>
                </>
              )}
            </button>

            <button
              onClick={() => onQuickSearch(heroTrack.artist.split(',')[0])}
              className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-colors cursor-pointer backdrop-blur-md"
            >
              More from Artist
            </button>
          </div>
        </div>
      </section>

      {/* 1.5. AI Recommended For You (Moved to Top) */}
      {aiRecommended && aiRecommended.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                AI Recommended For You
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {aiRecommended.map((track) => (
              <TrackCard key={`ai-${track.id}`} track={track} playlistContext={aiRecommended} />
            ))}
          </div>
        </section>
      )}

      {/* 2. Unified AI Vibe Generator Section */}
      {onOpenAiPlaylist && (
        <section className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-neutral-900/60 to-emerald-950/40 border border-purple-500/20 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0 shadow-md">
              <Wand2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>AI Vibe Studio</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-semibold">
                  Powered by AI
                </span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Click any vibe to craft an instant personalized 320kbps playlist
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {AI_VIBE_PILLS.map((vibe, idx) => (
              <button
                key={`vibe-${idx}`}
                onClick={onOpenAiPlaylist}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-purple-900/40 border border-white/5 hover:border-purple-500/30 text-xs text-text-secondary hover:text-white transition-all cursor-pointer"
              >
                {vibe.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* New: Recent Searches */}
      {recentSearches && recentSearches.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-neutral-400" />
            <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
              Recent Searches
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.slice(0, 8).map((search, idx) => (
              <button
                key={idx}
                onClick={() => onQuickSearch(search)}
                className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-text-secondary hover:text-white transition-colors border border-white/5 hover:border-white/20"
              >
                {search}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* New: Recently Played */}
      {history && history.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                Recently Played
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {history.slice(0, 4).map((track) => (
              <TrackCard key={`hist-${track.id}`} track={track} playlistContext={history.slice(0, 4)} />
            ))}
          </div>
        </section>
      )}

      {/* 3. Curated Trending Category Mixes */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>Featured Collections</span>
            </h3>
            <p className="text-xs text-text-secondary">Handpicked studio master playlists</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {CURATED_PLAYLISTS.map((playlist) => (
            <div
              key={playlist.id}
              onClick={() => onSelectPlaylist(playlist)}
              className="group relative flex flex-col p-3 rounded-2xl bg-background-surface hover:bg-background-card border border-white/5 hover:border-white/15 transition-all duration-200 cursor-pointer shadow-card"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-background-card">
                <img
                  src={playlist.cover}
                  alt={playlist.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <button
                  aria-label="Open playlist"
                  className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 flex items-center justify-center shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200"
                >
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </button>
              </div>

              <h4 className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                {playlist.title}
              </h4>
              <p className="text-xs text-text-secondary truncate mt-0.5">
                {playlist.trackCount} tracks • {playlist.category}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Top Bollywood & Hindi Hits */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
              Top Trending Hindi Hits
            </h3>
          </div>
          <button
            onClick={() => onQuickSearch('Trending Hindi Hits')}
            className="flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-emerald-400 transition-colors"
          >
            <span>See all</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {hindiTracks.map((track) => (
            <TrackCard key={track.id} track={track} playlistContext={hindiTracks} />
          ))}
        </div>
      </section>

      {/* 5. Global Hits */}
      {englishTracks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                Global Chartbusters
              </h3>
            </div>
            <button
              onClick={() => onQuickSearch('Global Billboard Hits')}
              className="flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-emerald-400 transition-colors"
            >
              <span>See all</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {englishTracks.map((track) => (
              <TrackCard key={track.id} track={track} playlistContext={englishTracks} />
            ))}
          </div>
        </section>
      )}

      {/* 6. Phonk & Bass */}
      {phonkTracks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
                Drift Phonk & Bass Energy
              </h3>
            </div>
            <button
              onClick={() => onQuickSearch('Trending Drift Phonk')}
              className="flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-emerald-400 transition-colors"
            >
              <span>See all</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {phonkTracks.map((track) => (
              <TrackCard key={track.id} track={track} playlistContext={phonkTracks} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
