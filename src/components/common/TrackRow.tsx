import React from 'react';
import type { Track } from '../../types/music';
import { useAudio } from '../../context/AudioContext';
import { Play, Pause, Heart, Plus, Download } from 'lucide-react';
import { SourceBadge } from './SourceBadge';

interface TrackRowProps {
  track: Track;
  index: number;
  playlistContext?: Track[];
  showIndex?: boolean;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  playlistContext,
  showIndex = true,
}) => {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlayPause,
    toggleLike,
    isLiked,
    addToQueue,
    openDownloadModal,
  } = useAudio();

  const isCurrent = currentTrack?.id === track.id;
  const isCurrentPlaying = isCurrent && isPlaying;
  const liked = isLiked(track.id);

  const handleRowClick = () => {
    if (isCurrent) {
      togglePlayPause();
    } else {
      playTrack(track, playlistContext);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike(track);
  };

  const handleQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(track);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    openDownloadModal(track);
  };

  return (
    <div
      onClick={handleRowClick}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-150 cursor-pointer select-none ${
        isCurrent
          ? 'bg-emerald-950/20 border-emerald-500/20 text-white'
          : 'bg-transparent hover:bg-white/[0.03] border-transparent hover:border-white/5 text-neutral-300'
      }`}
    >
      {/* Index or Play Button */}
      {showIndex && (
        <div className="w-6 flex items-center justify-center text-xs text-text-muted shrink-0">
          {isCurrentPlaying ? (
            <div className="flex items-end gap-0.5 h-3.5">
              <span className="w-0.5 bg-emerald-400 rounded-full animate-eq-1" />
              <span className="w-0.5 bg-emerald-400 rounded-full animate-eq-2" />
              <span className="w-0.5 bg-emerald-400 rounded-full animate-eq-3" />
            </div>
          ) : (
            <>
              <span className="group-hover:hidden">{index + 1}</span>
              <button
                className="hidden group-hover:flex items-center justify-center text-emerald-400 hover:text-emerald-300"
                onClick={handleRowClick}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Thumbnail */}
      <div className="relative w-10 h-10 rounded-md overflow-hidden bg-background-card shrink-0">
        <img
          src={track.artwork}
          alt={track.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
          }}
        />
        {isCurrent && !showIndex && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            {isCurrentPlaying ? (
              <Pause className="w-4 h-4 text-emerald-400 fill-current" />
            ) : (
              <Play className="w-4 h-4 text-emerald-400 fill-current" />
            )}
          </div>
        )}
      </div>

      {/* Title & Artist */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium truncate ${
              isCurrent ? 'text-emerald-400 font-semibold' : 'group-hover:text-white'
            }`}
          >
            {track.title}
          </span>
          {track.hasLyrics && (
            <span className="hidden sm:inline text-[10px] px-1 py-0.2 rounded bg-white/10 text-neutral-400 font-mono shrink-0">
              LYRICS
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-secondary truncate">
            {track.artist}
          </span>
          {/* Duration shown inline on mobile since the right-side duration is hidden */}
          <span className="sm:hidden text-xs text-text-muted tabular-nums shrink-0">
            · {track.durationFormatted || '3:30'}
          </span>
        </div>
      </div>

      {/* Album name — desktop only */}
      {track.album && (
        <div className="hidden md:block w-1/4 min-w-0 text-xs text-text-muted truncate">
          {track.album}
        </div>
      )}

      {/* Source Badge */}
      <div className="shrink-0">
        <SourceBadge source={track.source} quality={track.quality} size="sm" />
      </div>

      {/* Quick Action Icons: always visible on mobile via sm:opacity-0, visible on hover for desktop */}
      <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleDownload}
          title="Download Audio or Video"
          className="p-1.5 rounded hover:bg-white/10 text-text-secondary hover:text-emerald-400 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={handleQueue}
          title="Add to queue"
          className="hidden sm:block p-1.5 rounded hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          onClick={handleLike}
          title={liked ? 'Remove from favorites' : 'Add to favorites'}
          className={`p-1.5 rounded hover:bg-white/10 transition-colors ${
            liked ? 'text-emerald-400' : 'text-text-secondary hover:text-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Duration — visible on sm and up */}
      <div className="hidden sm:block w-12 text-right text-xs text-text-muted tabular-nums shrink-0">
        {track.durationFormatted || '3:30'}
      </div>
    </div>
  );
};

