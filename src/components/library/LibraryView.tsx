import React, { useState } from 'react';
import { useAudio } from '../../context/AudioContext';
import { TrackRow } from '../common/TrackRow';
import { storage } from '../../utils/storage';
import { firebaseAuth } from '../../services/firebaseAuth';
import type { Playlist } from '../../types/music';
import { CreatePlaylistModal } from '../playlist/CreatePlaylistModal';
import { 
  Heart, 
  History, 
  ListMusic, 
  Plus, 
  Play, 
  FolderPlus, 
  Globe, 
  Lock, 
  Trash2, 
  LogIn, 
  Wand2 
} from 'lucide-react';

interface LibraryViewProps {
  initialTab?: 'liked' | 'history' | 'playlists' | 'downloads';
  onSelectPlaylist: (playlist: Playlist) => void;
  onOpenAiPlaylist?: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  initialTab = 'liked',
  onSelectPlaylist,
  onOpenAiPlaylist,
}) => {
  const { likedTracks, history, downloadedTracks, playTrack, user, openAuthModal } = useAudio();
  const [activeSubTab, setActiveSubTab] = useState<'liked' | 'history' | 'playlists' | 'downloads'>(initialTab);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>(() => storage.getUserPlaylists());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  React.useEffect(() => {
    if (initialTab) {
      setActiveSubTab(initialTab);
    }
  }, [initialTab]);

  const handleSubTabClick = (tab: 'liked' | 'history' | 'playlists' | 'downloads') => {
    setActiveSubTab(tab);
    if (!user) {
      if (tab === 'liked') {
        openAuthModal('Sign in with Google or Email to access and sync your Liked Songs!');
      } else if (tab === 'playlists') {
        openAuthModal('Sign in with Google or Email to create and sync custom playlists!');
      } else if (tab === 'history') {
        openAuthModal('Sign in with Google or Email to access your listening history across devices!');
      }
    }
  };

  const handlePlayAllLiked = () => {
    if (likedTracks.length > 0) {
      playTrack(likedTracks[0], likedTracks);
    }
  };

  const handlePlayAllHistory = () => {
    if (history.length > 0) {
      playTrack(history[0], history);
    }
  };

  const handlePlayAllDownloads = () => {
    if (downloadedTracks.length > 0) {
      playTrack(downloadedTracks[0], downloadedTracks);
    }
  };

  const handleOpenCreatePlaylist = () => {
    if (!user) {
      openAuthModal('Please sign in with Google or Email to create and sync custom playlists!');
      return;
    }
    setIsCreateModalOpen(true);
  };

  const handlePlaylistCreated = (newPlaylist: Playlist) => {
    setUserPlaylists((prev) => [newPlaylist, ...prev]);
    firebaseAuth.syncToCloud().catch(() => {});
  };

  const handleDeletePlaylist = (e: React.MouseEvent, playlistId: string) => {
    e.stopPropagation();
    storage.deletePlaylist(playlistId);
    setUserPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    firebaseAuth.syncToCloud().catch(() => {});
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Sub tabs: Liked Songs / Playlists / History / Downloads - Always visible */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => handleSubTabClick('liked')}
            className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeSubTab === 'liked'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>Liked Songs {user && `(${likedTracks.length})`}</span>
          </button>

          <button
            onClick={() => handleSubTabClick('playlists')}
            className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeSubTab === 'playlists'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Playlists {user && `(${userPlaylists.length})`}</span>
          </button>

          <button
            onClick={() => handleSubTabClick('history')}
            className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeSubTab === 'history'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Recently Played</span>
          </button>

          {user && (
            <button
              onClick={() => handleSubTabClick('downloads')}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeSubTab === 'downloads'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Downloads ({downloadedTracks.length})</span>
            </button>
          )}
        </div>

        {activeSubTab === 'playlists' && (
          <div className="flex items-center gap-2">
            {onOpenAiPlaylist && (
              <button
                onClick={onOpenAiPlaylist}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 text-xs font-bold transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
                <span>✨ AI Creator</span>
              </button>
            )}
            <button
              onClick={handleOpenCreatePlaylist}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Playlist</span>
            </button>
          </div>
        )}
      </div>

      {/* Guest Mode Card if not signed in */}
      {/* Guest Mode Card if not signed in */}
      {!user && activeSubTab !== 'downloads' ? (
        <div className="py-16 text-center max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-card">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">
            {activeSubTab === 'liked'
              ? 'Your Liked Songs'
              : activeSubTab === 'playlists'
              ? 'Your Custom Playlists'
              : 'Your Playback History'}
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed max-w-xs mx-auto">
            Please sign in with Google or Email to view your favorites, create custom mixes, and sync across all your devices.
          </p>
          <button
            onClick={() => openAuthModal(`Sign in to access your ${activeSubTab} and sync across devices!`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Unlock</span>
          </button>
        </div>
      ) : (
        <>
          {/* Tab 1: Liked Songs (Authenticated) */}
          {activeSubTab === 'liked' && (
            <div className="space-y-4">
              {likedTracks.length > 0 && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={handlePlayAllLiked}
                    className="flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play All ({likedTracks.length} tracks)</span>
                  </button>
                </div>
              )}

              {likedTracks.length === 0 ? (
                <div className="py-20 text-center max-w-sm mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-emerald-400">
                    <Heart className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">No liked songs yet</h4>
                  <p className="text-xs text-text-secondary">
                    Tap the heart icon on any song to save it here for instant access across sessions.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-background-surface border border-white/5 divide-y divide-white/5 p-2">
                  {likedTracks.map((track, i) => (
                    <TrackRow key={track.id} track={track} index={i} playlistContext={likedTracks} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Listening History (Authenticated) */}
          {activeSubTab === 'history' && (
            <div className="space-y-4">
              {history.length > 0 && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={handlePlayAllHistory}
                    className="flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play Recent Tracks</span>
                  </button>
                </div>
              )}

              {history.length === 0 ? (
                <div className="py-20 text-center max-w-sm mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-text-secondary">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">No playback history</h4>
                  <p className="text-xs text-text-secondary">
                    Songs you stream will automatically appear here.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-background-surface border border-white/5 divide-y divide-white/5 p-2">
                  {history.map((track, i) => (
                    <TrackRow key={`hist-${track.id}-${i}`} track={track} index={i} playlistContext={history} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Custom Playlists (Authenticated) */}
          {activeSubTab === 'playlists' && (
            <div className="space-y-4">
              {userPlaylists.length === 0 ? (
                <div className="py-20 text-center max-w-sm mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-emerald-400">
                    <FolderPlus className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Create Your Custom Playlist</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Build Public or Private mixes combining your favorite tracks or use AI Studio!
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {onOpenAiPlaylist && (
                      <button
                        onClick={onOpenAiPlaylist}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>✨ AI Playlist</span>
                      </button>
                    )}
                    <button
                      onClick={handleOpenCreatePlaylist}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Playlist</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {userPlaylists.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => onSelectPlaylist(pl)}
                      className="group relative flex flex-col p-3 rounded-2xl bg-background-surface hover:bg-background-card border border-white/5 hover:border-white/15 transition-all cursor-pointer shadow-card"
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden mb-2.5 bg-background-card">
                        <img
                          src={pl.cover}
                          alt={pl.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Privacy Badge */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-semibold flex items-center gap-1">
                          {pl.isPrivate ? (
                            <span className="flex items-center gap-0.5 text-indigo-300">
                              <Lock className="w-2.5 h-2.5" /> Private
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-emerald-300">
                              <Globe className="w-2.5 h-2.5" /> Public
                            </span>
                          )}
                        </div>

                        {/* Delete button on hover */}
                        <button
                          onClick={(e) => handleDeletePlaylist(e, pl.id)}
                          title="Delete Playlist"
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-red-500/80 text-white/70 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                        {pl.title}
                      </h4>
                      <p className="text-[11px] text-text-secondary truncate mt-0.5">
                        {pl.tracks?.length || pl.trackCount || 0} tracks
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Tab 4: Downloads */}
          {activeSubTab === 'downloads' && (
            <div className="space-y-4">
              {downloadedTracks.length > 0 && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={handlePlayAllDownloads}
                    className="flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play All ({downloadedTracks.length} tracks)</span>
                  </button>
                </div>
              )}

              {downloadedTracks.length === 0 ? (
                <div className="py-20 text-center max-w-sm mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-emerald-400">
                    <FolderPlus className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">No downloaded songs yet</h4>
                  <p className="text-xs text-text-secondary">
                    Click the download icon on any song to save it offline.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-background-surface border border-white/5 divide-y divide-white/5 p-2">
                  {downloadedTracks.map((track, i) => (
                    <TrackRow key={`dl-${track.id}-${i}`} track={track} index={i} playlistContext={downloadedTracks} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handlePlaylistCreated}
      />
    </div>
  );
};
