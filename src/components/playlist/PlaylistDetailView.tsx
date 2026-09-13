import React, { useState, useEffect } from 'react';
import type { Playlist, Track } from '../../types/music';
import { useAudio } from '../../context/AudioContext';
import { TrackRow } from '../common/TrackRow';
import { searchSaavnSongs } from '../../services/saavnApi';
import { searchYouTubeTracks } from '../../services/youtubeApi';
import { INITIAL_POPULAR_TRACKS } from '../../services/curatedData';
import { Play, Pause, ArrowLeft, Loader2 } from 'lucide-react';

interface PlaylistDetailViewProps {
  playlist: Playlist;
  onBack: () => void;
}

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({ playlist, onBack }) => {
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudio();
  const [tracks, setTracks] = useState<Track[]>(playlist.tracks || []);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadPlaylistTracks = async () => {
      if ((playlist.type === 'user' || playlist.id.startsWith('ai_') || playlist.id.startsWith('pl_') || (playlist.tracks && playlist.tracks.length > 0))) {
        setTracks(playlist.tracks || []);
        setLoading(false);
        return;
      }

      try {
        let fetched: Track[] = [];

        if (playlist.category === 'hindi') {
          fetched = await searchSaavnSongs('Top Bollywood Hindi Hits', 25);
        } else if (playlist.category === 'english') {
          fetched = await searchSaavnSongs('Global Pop Top 50 English', 25);
        } else if (playlist.category === 'phonk') {
          fetched = await searchYouTubeTracks('Trending Drift Phonk 2024 Bass Boosted', 20);
        } else if (playlist.category === 'classics') {
          fetched = await searchSaavnSongs('Evergreen Kishore Kumar RD Burman Lata', 25);
        } else if (playlist.category === 'lofi') {
          fetched = await searchYouTubeTracks('Lofi Hip Hop Study Relax Beats', 18);
        } else {
          fetched = await searchSaavnSongs(playlist.title, 20);
        }

        if (isMounted) {
          setTracks(fetched.length > 0 ? fetched : INITIAL_POPULAR_TRACKS);
          setLoading(false);
        }
      } catch (e) {
        console.warn('Error loading playlist songs:', e);
        if (isMounted) {
          setTracks(INITIAL_POPULAR_TRACKS);
          setLoading(false);
        }
      }
    };

    loadPlaylistTracks();

    return () => {
      isMounted = false;
    };
  }, [playlist.id, playlist.category, playlist.title, playlist.type, playlist.tracks]);

  const isPlaylistActive = tracks.some(t => t.id === currentTrack?.id);
  const isPlaylistPlaying = isPlaylistActive && isPlaying;

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    if (isPlaylistPlaying) {
      togglePlayPause();
    } else if (isPlaylistActive) {
      togglePlayPause();
    } else {
      playTrack(tracks[0], tracks);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Collections</span>
      </button>

      {/* Playlist Hero Banner */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pb-6 border-b border-white/5">
        <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden shrink-0 shadow-2xl bg-background-card border border-white/10">
          <img
            src={playlist.cover}
            alt={playlist.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              {playlist.type === 'user' ? 'Custom Playlist' : 'Curated Playlist'}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            {playlist.title}
          </h1>

          <p className="text-sm text-text-secondary max-w-2xl">
            {playlist.description}
          </p>

          <div className="flex items-center justify-center md:justify-start gap-3 pt-3">
            <button
              onClick={handlePlayAll}
              disabled={tracks.length === 0 || loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 text-xs font-bold transition-all shadow-md active:scale-95"
            >
              {isPlaylistPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Playlist</span>
                </>
              )}
            </button>

            <span className="text-xs text-text-muted">
              {tracks.length} tracks
            </span>
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
            <p className="text-sm">Loading playlist tracks...</p>
          </div>
        ) : tracks.length === 0 ? (
          <div className="py-16 text-center text-text-muted text-xs">
            No tracks found in this playlist.
          </div>
        ) : (
          <div className="rounded-xl bg-background-surface border border-white/5 divide-y divide-white/5 p-2">
            {tracks.map((track, i) => (
              <TrackRow
                key={`${track.id}-${i}`}
                track={track}
                index={i}
                playlistContext={tracks}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
