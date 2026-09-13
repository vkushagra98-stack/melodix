import React from 'react';
import { useAudio } from '../../context/AudioContext';
import { X, Trash2, Play } from 'lucide-react';
import { SourceBadge } from '../common/SourceBadge';

export const QueueDrawer: React.FC = () => {
  const {
    currentTrack,
    queue,
    queueIndex,
    isQueueOpen,
    setIsQueueOpen,
    playTrack,
    removeFromQueue,
    clearQueue,
  } = useAudio();

  if (!isQueueOpen) return null;

  const upcomingTracks = queue.slice(queueIndex + 1);

  return (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md h-full bg-neutral-950/60 backdrop-blur-3xl border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white">Playback Queue</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-text-secondary">
              {queue.length} tracks
            </span>
          </div>

          <div className="flex items-center gap-2">
            {upcomingTracks.length > 0 && (
              <button
                onClick={clearQueue}
                title="Clear upcoming"
                className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-white/5 text-xs flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
            <button
              onClick={() => setIsQueueOpen(false)}
              className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Queue Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Currently Playing Section */}
          {currentTrack && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 mb-2 px-1">
                Now Playing
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                <img
                  src={currentTrack.artwork}
                  alt={currentTrack.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {currentTrack.title}
                  </div>
                  <div className="text-xs text-text-secondary truncate mt-0.5">
                    {currentTrack.artist}
                  </div>
                  <div className="mt-1.5">
                    <SourceBadge source={currentTrack.source} quality={currentTrack.quality} size="sm" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Up Next List */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2 px-1">
              Up Next ({upcomingTracks.length})
            </div>

            {upcomingTracks.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                No upcoming tracks. Queue will stop or loop based on repeat setting.
              </div>
            ) : (
              <div className="space-y-1.5">
                {upcomingTracks.map((track, idx) => {
                  const absoluteIndex = queueIndex + 1 + idx;
                  return (
                    <div
                      key={`${track.id}-${absoluteIndex}`}
                      className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-colors"
                    >
                      <button
                        onClick={() => playTrack(track)}
                        className="relative w-9 h-9 rounded-md overflow-hidden bg-background-card shrink-0"
                      >
                        <img
                          src={track.artwork}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play className="w-3.5 h-3.5 text-white fill-current" />
                        </div>
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white truncate group-hover:text-emerald-400 transition-colors">
                          {track.title}
                        </div>
                        <div className="text-[11px] text-text-secondary truncate">
                          {track.artist}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <SourceBadge source={track.source} quality={track.quality} size="sm" />
                      </div>

                      <button
                        onClick={() => removeFromQueue(absoluteIndex)}
                        title="Remove from queue"
                        className="p-1 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
