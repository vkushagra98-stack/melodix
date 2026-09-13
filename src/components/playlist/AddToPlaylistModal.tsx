import React, { useState, useEffect } from 'react';
import { X, Plus, Check, Music2, Globe, Lock, ListPlus } from 'lucide-react';
import { storage } from '../../utils/storage';
import type { Track, Playlist } from '../../types/music';
import { useToast } from '../../context/ToastContext';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  onOpenCreatePlaylist: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isOpen,
  onClose,
  track,
  onOpenCreatePlaylist,
}) => {
  const { showToast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      const userPlaylists = storage.getUserPlaylists();
      setPlaylists(userPlaylists);

      if (track) {
        const alreadyIn = new Set<string>();
        userPlaylists.forEach((p) => {
          if (p.tracks?.some((t) => t.id === track.id)) {
            alreadyIn.add(p.id);
          }
        });
        setAddedIds(alreadyIn);
      }
    }
  }, [isOpen, track]);

  if (!isOpen || !track) return null;

  const handleTogglePlaylist = (playlistId: string) => {
    const playlistName = playlists.find(p => p.id === playlistId)?.title || 'Playlist';
    
    if (addedIds.has(playlistId)) {
      storage.removeTrackFromPlaylist(playlistId, track.id);
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(playlistId);
        return next;
      });
      showToast(`Removed from ${playlistName}`);
    } else {
      const success = storage.addTrackToPlaylist(playlistId, track);
      if (success) {
        setAddedIds((prev) => new Set(prev).add(playlistId));
        showToast(`Added to ${playlistName}`);
      }
    }
    setPlaylists(storage.getUserPlaylists());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-md bg-background-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-background-card/80">
          <div className="flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Add to Playlist</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Track Preview */}
        <div className="px-6 py-3 bg-white/5 border-b border-white/5 flex items-center gap-3">
          <img
            src={track.artwork}
            alt={track.title}
            className="w-10 h-10 rounded-lg object-cover shadow-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{track.title}</p>
            <p className="text-[11px] text-text-muted truncate">{track.artist}</p>
          </div>
        </div>

        {/* Playlist List */}
        <div className="p-4 max-h-64 overflow-y-auto space-y-2 no-scrollbar">
          {playlists.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <Music2 className="w-8 h-8 text-text-muted mx-auto" />
              <p className="text-xs text-text-secondary">No custom playlists created yet.</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreatePlaylist();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-neutral-950 hover:bg-emerald-400 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Your First Playlist</span>
              </button>
            </div>
          ) : (
            playlists.map((playlist) => {
              const isAdded = addedIds.has(playlist.id);
              return (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => handleTogglePlaylist(playlist.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isAdded
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-white'
                      : 'bg-background-card border-white/5 hover:border-white/15 text-text-secondary hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={playlist.cover}
                      alt={playlist.title}
                      className="w-9 h-9 rounded-lg object-cover"
                    />
                    <div className="text-left min-w-0">
                      <p className="text-xs font-medium text-white truncate">{playlist.title}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                        {playlist.isPrivate ? (
                          <span className="flex items-center gap-0.5 text-indigo-400">
                            <Lock className="w-2.5 h-2.5" /> Private
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-emerald-400">
                            <Globe className="w-2.5 h-2.5" /> Public
                          </span>
                        )}
                        <span>•</span>
                        <span>{playlist.trackCount || 0} tracks</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      isAdded
                        ? 'bg-emerald-500 border-emerald-400 text-neutral-950'
                        : 'border-white/20 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 flex items-center justify-between bg-background-card/80">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCreatePlaylist();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
          >
            <Plus className="w-4 h-4" />
            <span>New Playlist</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
