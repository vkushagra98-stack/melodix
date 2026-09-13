import React, { useState, useEffect } from 'react';
import type { Track, SearchFilters } from '../../types/music';
import type { UnifiedSearchResults } from '../../services/unifiedSearch';
import { searchUnified } from '../../services/unifiedSearch';
import { TrackRow } from '../common/TrackRow';
import { TrackCard } from '../common/TrackCard';
import { storage } from '../../utils/storage';
import { firebaseAuth } from '../../services/firebaseAuth';
import { 
  Search, 
  LayoutGrid, 
  List, 
  Music2, 
  Loader2, 
  Clock, 
  Trash2,
  TrendingUp 
} from 'lucide-react';

interface SearchViewProps {
  filters: SearchFilters;
  onFilterChange: (newFilters: Partial<SearchFilters>) => void;
}

const TRENDING_TAGS = [
  'Arijit Singh Hits',
  'Majboor Sheheryar Rehan',
  'Jhol Maanu Annural',
  'Diljit Dosanjh',
  'Coke Studio Season 15',
  'Starboy The Weeknd',
  'Trending Phonk 2025',
  'Kordhell Drift Phonk',
  'Anirudh Ravichander',
  'Queen Bohemian Rhapsody',
];

export const SearchView: React.FC<SearchViewProps> = ({ filters, onFilterChange }) => {
  const [results, setResults] = useState<UnifiedSearchResults>({ all: [], saavn: [], youtube: [] });
  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchHistory, setSearchHistory] = useState<string[]>(() => storage.getSearchHistory());

  useEffect(() => {
    if (!filters.query.trim()) {
      setResults({ all: [], saavn: [], youtube: [] });
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await searchUnified(filters.query);
        if (isMounted) {
          setResults(res);
          setLoading(false);
          // Save search query into history
          storage.addSearchQuery(filters.query.trim());
          setSearchHistory(storage.getSearchHistory());
          firebaseAuth.syncToCloud().catch(() => {});
        }
      } catch (err) {
        console.warn('Search error:', err);
        if (isMounted) setLoading(false);
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [filters.query]);

  const handleClearHistory = () => {
    storage.clearSearchHistory();
    setSearchHistory([]);
    firebaseAuth.syncToCloud().catch(() => {});
  };

  const activeTracks: Track[] = results.all;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Search History & Trending Chips */}
      {!filters.query && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Recent Search History Section */}
          {searchHistory.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Recent Searches</span>
                </div>
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 text-[11px] text-text-muted hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear History</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {searchHistory.map((item, idx) => (
                  <button
                    key={`hist-${idx}`}
                    onClick={() => onFilterChange({ query: item })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background-card hover:bg-background-cardHover text-text-primary text-xs border border-white/5 hover:border-emerald-500/30 transition-all shadow-sm"
                  >
                    <Search className="w-3 h-3 text-text-muted" />
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending Searches */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>Trending Across Bollywood, Coke Studio & Global</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              {TRENDING_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onFilterChange({ query: tag })}
                  className="px-3.5 py-1.5 rounded-full bg-background-card hover:bg-background-cardHover text-text-secondary hover:text-white border border-white/5 hover:border-white/15 transition-all shrink-0"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search Header & View Mode Switcher */}
      {filters.query && (
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Results for &ldquo;<span className="text-emerald-400">{filters.query}</span>&rdquo;
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-text-secondary">
              {activeTracks.length} tracks
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* List / Grid Toggle */}
            <div className="flex items-center bg-background-card rounded-lg p-0.5 border border-white/5">
              <button
                onClick={() => setViewMode('list')}
                title="List View"
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                title="Grid View"
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content States */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-muted gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-sm">Searching Studio audio and official releases...</p>
        </div>
      ) : !filters.query ? (
        <div className="py-16 text-center max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-background-card border border-white/10 flex items-center justify-center mx-auto text-emerald-400 shadow-card">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">
            Universal Music Search
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Search songs, albums, Coke Studio releases, and artists with live synced karaoke lyrics.
          </p>
        </div>
      ) : activeTracks.length === 0 ? (
        <div className="py-20 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-background-card border border-white/10 flex items-center justify-center mx-auto text-text-muted">
            <Music2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">No matches found</h3>
          <p className="text-xs text-text-secondary">
            Try checking for spelling errors or searching by artist name (e.g. &ldquo;Arijit Singh&rdquo;, &ldquo;Sheheryar Rehan&rdquo;, &ldquo;Maanu&rdquo;).
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {activeTracks.map((track) => (
            <TrackCard key={track.id} track={track} playlistContext={activeTracks} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-background-surface border border-white/5 divide-y divide-white/5 p-2">
          {activeTracks.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              index={i}
              playlistContext={activeTracks}
            />
          ))}
        </div>
      )}
    </div>
  );
};
