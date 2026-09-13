import React from 'react';
import type { Track } from '../../types/music';
import { useAudio } from '../../context/AudioContext';
import { Play, Pause, Heart, Plus, Download } from 'lucide-react';
import { SourceBadge } from './SourceBadge';

interface TrackCardProps {
  track: Track;
  playlistContext?: Track[];
}

export const TrackCard: React.FC<TrackCardProps> = ({ track, playlistContext }) => {
  const { currentTrack, isPlaying, playTrack, togglePlayPause, toggleLike, isLiked, addToQueue, openDownloadModal } = useAudio();

  const isCurrent = currentTrack?.id === track.id;
  const isCurrentPlaying = isCurrent && isPlaying;
  const liked = isLiked(track.id);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlayPause();
    } else {
      playTrack(track, playlistContext);
    }
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike(track);
  };

  const handleQueueClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(track);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openDownloadModal(track);
  };

  return (
    <div
      onClick={handlePlayClick}
      className="group relative flex flex-col p-3 rounded-xl bg-background-surface hover:bg-background-card border border-white/5 hover:border-white/15 transition-all duration-200 cursor-pointer select-none"
    >
      {/* Artwork Container */}
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-background-subtle mb-3">
        <img
          src={track.artwork}
          alt={track.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
          }}
        />

        {/* Source Badge on top-right */}
        <div className="absolute top-2 right-2">
          <SourceBadge source={track.source} quality={track.quality} size="sm" />
        </div>

        {/* Playing Equalizer Overlay */}
        {isCurrentPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="flex items-end gap-1 h-5">
              <span className="w-1 bg-emerald-400 rounded-full animate-eq-1" />
              <span className="w-1 bg-emerald-400 rounded-full animate-eq-2" />
              <span className="w-1 bg-emerald-400 rounded-full animate-eq-3" />
              <span className="w-1 bg-emerald-400 rounded-full animate-eq-4" />
            </div>
          </div>
        )}

        {/* Floating Play/Pause Action Button */}
        <button
          onClick={handlePlayClick}
          aria-label={isCurrentPlaying ? 'Pause' : 'Play'}
          className={`absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 flex items-center justify-center shadow-lg transition-all duration-200 ${
            isCurrentPlaying
              ? 'opacity-100 scale-100'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
        >
          {isCurrentPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>
      </div>

      {/* Track Metadata */}
      <div className="flex flex-col flex-1 min-w-0">
        <h4
          className={`text-sm font-semibold truncate transition-colors ${
            isCurrent ? 'text-emerald-400' : 'text-neutral-200 group-hover:text-white'
          }`}
          title={track.title}
        >
          {track.title}
        </h4>
        <p className="text-xs text-text-secondary truncate mt-0.5" title={track.artist}>
          {track.artist}
        </p>

        {/* Bottom card actions */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px] text-text-muted">
          <span>{track.durationFormatted || '3:30'}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleDownloadClick}
              title="Download Audio or Video"
              className="p-1 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleQueueClick}
              title="Add to Up Next"
              className="p-1 hover:text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleLikeClick}
              title={liked ? 'Unlike' : 'Like song'}
              className={`p-1 transition-colors ${liked ? 'text-emerald-400' : 'hover:text-white'}`}
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
