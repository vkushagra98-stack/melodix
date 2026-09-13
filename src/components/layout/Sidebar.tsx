import React from 'react';
import { Logo } from '../common/Logo';
import type { Playlist } from '../../types/music';
import { useAudio } from '../../context/AudioContext';
import { 
  Home, 
  Search, 
  Library, 
  Heart, 
  History, 
  Wand2,
  Code,
  Settings,
  Download
} from 'lucide-react';

export type NavTab = 'home' | 'search' | 'library' | 'liked' | 'history' | 'downloads' | 'playlist' | 'developer' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  selectedPlaylist?: Playlist | null;
  onSelectTab: (tab: NavTab) => void;
  onSelectPlaylist?: (playlist: Playlist) => void;
  onOpenAiPlaylist?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAiPlaylist,
}) => {
  const { likedTracks, history, downloadedTracks, user } = useAudio();

  const handleLikedClick = () => {
    onSelectTab('liked');
  };

  const handleHistoryClick = () => {
    onSelectTab('history');
  };

  const handleDownloadsClick = () => {
    onSelectTab('downloads');
  };

  return (
    <aside className="w-64 h-full flex flex-col bg-background-surface border-r border-border shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-border/50">
        <Logo size="md" onClick={() => onSelectTab('home')} />
      </div>

      {/* Main Navigation Links */}
      <div className="px-3 py-4 flex flex-col gap-1">
        <button
          onClick={() => onSelectTab('home')}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            currentTab === 'home'
              ? 'bg-white/10 text-white font-semibold shadow-sm'
              : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Home className={`w-4 h-4 ${currentTab === 'home' ? 'text-emerald-400' : ''}`} />
          <span>Home</span>
        </button>

        <button
          onClick={() => onSelectTab('search')}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            currentTab === 'search'
              ? 'bg-white/10 text-white font-semibold shadow-sm'
              : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Search className={`w-4 h-4 ${currentTab === 'search' ? 'text-emerald-400' : ''}`} />
          <span>Search</span>
        </button>

        <button
          onClick={() => onSelectTab('library')}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            currentTab === 'library'
              ? 'bg-white/10 text-white font-semibold shadow-sm'
              : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Library className={`w-4 h-4 ${currentTab === 'library' ? 'text-emerald-400' : ''}`} />
          <span>Your Library</span>
        </button>
      </div>

      {/* Divider */}
      <div className="px-5 py-1">
        <div className="h-px bg-white/5" />
      </div>

      {/* Library Collections & AI Studio */}
      <div className="px-3 py-2 flex flex-col gap-1">
        <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted/50">
          My Library
        </span>
        <button
          onClick={handleLikedClick}
          className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
            currentTab === 'liked'
              ? 'bg-emerald-950/30 text-emerald-300 font-semibold'
              : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Heart className="w-3 h-3 fill-current" />
            </div>
            <span>Liked Songs</span>
          </div>
          {user && likedTracks.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-text-secondary">
              {likedTracks.length}
            </span>
          )}
        </button>

        <button
          onClick={handleHistoryClick}
          className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
            currentTab === 'history'
              ? 'bg-white/10 text-white font-semibold'
              : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-white/5 text-text-secondary flex items-center justify-center">
              <History className="w-3 h-3" />
            </div>
            <span>Recently Played</span>
          </div>
          {user && history.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-text-secondary">
              {history.length}
            </span>
          )}
        </button>

        <button
          onClick={handleDownloadsClick}
          className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
            currentTab === 'downloads'
              ? 'bg-amber-500/20 text-amber-300 font-semibold'
              : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Download className="w-3 h-3" />
            </div>
            <span>Downloaded Songs</span>
          </div>
          {user && downloadedTracks.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-text-secondary">
              {downloadedTracks.length}
            </span>
          )}
        </button>

        {/* AI Playlist Studio Button */}
        {onOpenAiPlaylist && (
          <button
            onClick={onOpenAiPlaylist}
            className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-purple-200 hover:text-white bg-purple-950/20 hover:bg-purple-900/40 border border-purple-500/20 transition-all group mt-1 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded bg-purple-500/20 text-purple-300 flex items-center justify-center">
                <Wand2 className="w-3 h-3 group-hover:rotate-12 transition-transform" />
              </div>
              <span>AI Playlist Studio</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/30 text-purple-300">
              AI
            </span>
          </button>
        )}
      </div>

      {/* Flexible Spacer - natural breathing room without any nested scrolling */}
      <div className="flex-1 min-h-4" />

      {/* Divider */}
      <div className="px-5 py-2">
        <div className="h-px bg-white/5" />
      </div>

      {/* Utilities & Tools */}
      <div className="px-3 pb-28 md:pb-32 flex flex-col gap-1.5">
        {/* Melodix API */}
        <button
          onClick={() => onSelectTab('developer')}
          className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-left transition-all border ${
            currentTab === 'developer'
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              : 'bg-black/20 border-white/5 text-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Code className="w-4 h-4 text-blue-400" />
            <span>Developer API</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-blue-500/20 text-blue-300 uppercase tracking-widest font-mono">
            Dev
          </span>
        </button>

        {/* Install Melodix App */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-install-modal'))}
          className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-left transition-all border bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Install App</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-emerald-500/30 text-emerald-200 uppercase tracking-wider font-mono">
            App
          </span>
        </button>

        {/* Settings */}
        <button
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-left transition-all border ${
            currentTab === 'settings'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-transparent border-transparent text-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings className="w-4 h-4 text-text-muted" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
